/**
 * BACKEND · server/agent.ts — the agent. Runs ONLY on the server.
 *
 * Holds everything secret or AI-related: the model, the API key (read from
 * .env.local by the OpenRouter provider), the instructions, the stream handling.
 * Python equivalent: a service module your FastAPI endpoint calls.
 */
import "server-only"; // build fails if any browser file ever imports this one

import { buildUserPrompt, pipeJsonRender } from "@json-render/core";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { APICallError, convertToModelMessages, createUIMessageStreamResponse, RetryError, StreamProviderError, streamText, toUIMessageStream, type ToolSet, type UIMessageChunk } from "ai";
import { buildInstructions } from "@/lib/catalog";
import { currentSpec } from "@/lib/spec";
import { MODEL_BUSY, type GenUIMessage, type LlmCall, type ServerTrace } from "@/lib/trace";
import { listComposites } from "@/server/componentStore";

// Every model goes through OpenRouter: one key (OPENROUTER_API_KEY), any vendor.
// The model id comes from .env.local ("vendor/model", see openrouter.ai/models).
const openrouter = createOpenRouter({ compatibility: "strict", appName: "GenUI Runtime Components" });
const MODEL = process.env.OPENROUTER_MODEL ?? "google/gemini-3.5-flash";

// A model under high demand gets slow, sometimes accepts a request and then
// sends nothing for minutes (seen with Gemini: 82 s, 9.6 min, 23 min), or
// stops halfway with an error. Give up instead of hanging: the chat shows
// the error and asks once more on its own (ChatScreen.tsx).
const FIRST_OUTPUT_MS = 45_000; // it thinks before it writes the first word
const BETWEEN_OUTPUT_MS = 20_000; // once writing, text arrives every second or so

export async function streamAgentReply(messages: GenUIMessage[], abortSignal?: AbortSignal): Promise<Response> {
  const startedAt = Date.now();
  const seconds = () => `${((Date.now() - startedAt) / 1000).toFixed(1)}s`;
  let firstOutput = ""; // when the first word arrived, for the server log

  // 0. Built per request: json-render writes the instructions from our catalog,
  //    the composites in the database (added from /components) and our rules.
  const instructions = buildInstructions(await listComposites());

  // 1. EDITS: if a page already exists, wrap the user's latest request with
  //    the current page, so the LLM changes only what was asked.
  //    (Without this the LLM wouldn't know what it built before.)
  const { messages: withPage, sentPrompt, editMode } = attachCurrentPage(messages);

  // 2. Ask the LLM.
  //    Watch for the first word from the moment we ask: the AI SDK's own
  //    first-chunk timer only starts once OpenRouter has sent the response
  //    headers, and a stalled call may never send them.
  const quiet = new AbortController();
  const quietTimer = setTimeout(() => quiet.abort(new Error(`First output timeout of ${FIRST_OUTPUT_MS}ms exceeded`)), FIRST_OUTPUT_MS);
  let rawOutput = ""; // collected for the How-it-works page
  const llmCalls: LlmCall[] = [];
  const result = streamText({
    model: openrouter(MODEL),
    instructions,
    messages: await convertToModelMessages(withPage), // browser format -> model format
    include: { requestBody: true }, // keep the exact HTTP body sent to OpenRouter (How-it-works page)
    // Stop button or closed tab (abortSignal), or no first word in time (quiet): stop the model call.
    abortSignal: abortSignal ? AbortSignal.any([abortSignal, quiet.signal]) : quiet.signal,
    timeout: { chunkMs: BETWEEN_OUTPUT_MS },
    onChunk: ({ chunk }) => {
      if (chunk.type !== "text-delta") return;
      clearTimeout(quietTimer);
      firstOutput ||= seconds();
      rawOutput += chunk.text;
    },
    onError: ({ error }) => console.error(`[agent] ${MODEL} failed after ${seconds()}:`, error),
    onAbort: ({ reason }) => console.warn(`[agent] ${MODEL} stopped after ${seconds()}: ${(reason instanceof Error && reason.message) || "the browser cancelled"}`),
    // One "step" = one call to the LLM. Without tools there is exactly one.
    onStepEnd: (step) => {
      llmCalls.push({
        step: step.stepNumber,
        provider: step.model.provider,
        modelId: step.model.modelId,
        finishReason: step.finishReason,
        toolCalls: step.toolCalls.length,
        inputTokens: step.usage.inputTokens,
        outputTokens: step.usage.outputTokens,
        requestBody: parseBody(step.request.body),
      });
    },
    // Learning aid: print exactly what the LLM wrote, in the server terminal.
    onEnd: ({ text }) => {
      console.log("\n----- RAW LLM OUTPUT -----\n" + text + "\n--------------------------\n");
      console.log(`[agent] ${MODEL}: first output after ${firstOutput || "-"}, done after ${seconds()}`);
    },
  });

  // 3. The LLM's output is plain TEXT mixing a sentence and JSON lines.
  //    pipeJsonRender() sorts it: sentence -> "text" parts, JSON lines ->
  //    "data-spec" parts. The browser receives them already separated.
  return createUIMessageStreamResponse({
    headers: { "x-genui-model": MODEL }, // lets the test suite report which model it measured
    stream: pipeJsonRender(
      toUIMessageStream<ToolSet, GenUIMessage>({
        stream: result.stream,
        // Show real errors while learning; mark "busy" so the chat asks again.
        onError: (error) => (isBusy(error) ? `${MODEL_BUSY}: ` : "") + (error instanceof Error ? error.message : String(error)),
        // At the very end, attach a "trace" of what happened on the server.
        // It travels with the answer as message metadata (How-it-works page).
        messageMetadata: ({ part }) => {
          if (part.type !== "finish") return undefined;
          const trace: ServerTrace = {
            model: MODEL,
            durationMs: Date.now() - startedAt,
            instructionsChars: instructions.length,
            editMode,
            sentPrompt,
            rawOutput,
            llmCalls,
          };
          return { trace };
        },
      }).pipeThrough(timeoutsAsErrors()),
    ),
  });
}

/**
 * A timeout ends the stream as an "abort", which the chat shows as an empty
 * reply. Send it as an error instead: the chat says what happened, offers
 * Retry, and retries once by itself.
 */
function timeoutsAsErrors() {
  return new TransformStream<UIMessageChunk, UIMessageChunk>({
    transform(chunk, controller) {
      const timedOut = chunk.type === "abort" && chunk.reason?.includes("timeout");
      controller.enqueue(timedOut ? { type: "error", errorText: `${MODEL_BUSY}: ${chunk.reason?.replace(/^\w*Error: /, "")}.` } : chunk);
    },
  });
}

/**
 * Rate limited (429) or the model's host is down or overloaded (502, 503):
 * worth asking again. Errors before the answer starts were already retried
 * twice by the AI SDK and arrive wrapped in a RetryError.
 */
function isBusy(error: unknown): boolean {
  const e = RetryError.isInstance(error) ? error.lastError : error;
  return (APICallError.isInstance(e) || StreamProviderError.isInstance(e)) && e.isRetryable;
}

/** The provider request body, with the (huge, always identical) system instructions shortened. */
function parseBody(body: unknown): unknown {
  let parsed = body;
  try {
    if (typeof body === "string") parsed = JSON.parse(body);
  } catch {
    return body;
  }
  // OpenRouter uses OpenAI's chat format: the instructions are the first message, role "system".
  const request = parsed as { messages?: { role?: string; content?: { type?: string; text?: string }[] }[] };
  const [first, ...rest] = request?.messages ?? [];
  const text = first?.role === "system" ? first.content?.[0]?.text : undefined;
  if (!text) return parsed;
  return { ...request, messages: [{ ...first, content: [{ type: "text", text: `[${text.length} characters: the system instructions]` }] }, ...rest] };
}

function attachCurrentPage(messages: GenUIMessage[]) {
  const last = messages.at(-1);
  const request = last?.parts.map((p) => (p.type === "text" ? p.text : "")).join("") ?? "";
  const page = currentSpec(messages);
  if (!page || last?.role !== "user") return { messages, sentPrompt: request, editMode: false };

  const sentPrompt = buildUserPrompt({ prompt: request, currentSpec: page });
  const wrapped: GenUIMessage = { ...last, parts: [{ type: "text", text: sentPrompt }] };
  return { messages: [...messages.slice(0, -1), wrapped], sentPrompt, editMode: true };
}
