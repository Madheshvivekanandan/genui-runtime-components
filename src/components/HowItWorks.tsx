/**
 * FRONTEND · components/HowItWorks.tsx — the "How it works" page (URL /how-it-works).
 *
 * Replays ONE real chat turn step by step, from the prompt to the screen,
 * using the trace recorded by components/traceStore.ts (or a saved sample).
 * Layout: header (the prompt, the numbers) · sticky step list · the steps.
 */
"use client";

import { SPEC_DATA_PART_TYPE, type Spec } from "@json-render/core";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Preview } from "@/components/Canvas";
import { useComposites } from "@/components/compositeStore";
import { useTraces } from "@/components/traceStore";
import { buildCatalog, buildInstructions, RULES } from "@/lib/catalog";
import type { CompositeDef } from "@/lib/composites";
import { FLASH_DEAL_CARD } from "@/lib/demoComponent";
import sampleTraces from "@/lib/sample-traces.json";
import { childKeys } from "@/lib/spec";
import type { Trace } from "@/lib/trace";
import { Data, Mono, StepCard, StepNav, type Step } from "@/components/explainer/blocks";
import { TopBar } from "@/components/TopBar";

export function HowItWorks() {
  const stored = useTraces();
  const composites = useComposites() ?? [];
  const traces = stored.length ? stored : (sampleTraces as unknown as Trace[]);
  const [index, setIndex] = useState(0);
  const t = traces[Math.min(index, traces.length - 1)];
  const active = useActiveSection(13);

  if (!t) return <p className="p-10 text-sm text-muted">No trace yet: send a prompt in the app first.</p>;

  const s = t.server;
  const call = s?.llmCalls[0];
  const patches = t.parts.filter((p) => (p as { type: string }).type === SPEC_DATA_PART_TYPE);
  const steps = buildSteps(t, patches.length, composites);

  return (
    <div className="min-h-dvh bg-page text-fg">
      <TopBar current="/how-it-works" />
      <div className="mx-auto max-w-6xl px-6 py-14">
        {/* ================= HEADER: the request, the path, the numbers ================= */}
        <header className="space-y-8">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
            <span>{s?.editMode ? `Edit of page v${t.versionBefore}` : "New page"}</span>
            {!stored.length && <span>· Saved sample</span>}
            {traces.length > 1 && (
              <select
                value={index}
                onChange={(e) => setIndex(Number(e.target.value))}
                aria-label="Request"
                className="max-w-xs rounded-md border border-line bg-page px-2 py-1 text-fg"
              >
                {traces.map((tr, i) => (
                  <option key={tr.id} value={i}>
                    {tr.server?.editMode ? "Edit · " : "New · "}
                    {tr.userText.slice(0, 60)}
                  </option>
                ))}
              </select>
            )}
          </div>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight">“{t.userText}”</h1>
          <dl className="grid grid-cols-2 gap-6 border-t border-line pt-6 sm:grid-cols-3 lg:grid-cols-5">
            <Stat label="LLM calls" value={String(s?.llmCalls.length ?? "?")} note="requests to OpenRouter" />
            <Stat label="Tokens in" value={fmt(call?.inputTokens)} note="instructions + chat" />
            <Stat label="Tokens out" value={fmt(call?.outputTokens)} note="sentence + patches" />
            <Stat label="Patches" value={String(patches.length)} note="JSON lines applied" />
            <Stat label="Total time" value={s ? `${(s.durationMs / 1000).toFixed(1)}s` : "?"} note={s?.model ?? ""} />
          </dl>
        </header>

        {/* ================= STEP LIST + STEPS ================= */}
        <div className="mt-16 grid gap-12 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <StepNav steps={steps} active={active} extra={[{ id: "why-ai-sdk", label: "Why the Vercel AI SDK" }]} />
          </aside>
          <main className="min-w-0 space-y-12">
            {steps.map((st, i) => (
              <StepCard key={i} n={i + 1} step={st} />
            ))}
            <WhyAiSdk />
          </main>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* The 13 steps                                                        */
/* ================================================================== */

function buildSteps(t: Trace, patchCount: number, composites: CompositeDef[]): Step[] {
  const s = t.server;
  const call = s?.llmCalls[0];
  const body = call?.requestBody as ProviderBody | undefined;
  const request = safeJson(t.requestBody) as { messages?: unknown[] } | null;
  const instructions = buildInstructions(composites); // today's composites, not necessarily the ones at request time
  const v = t.versionBefore;

  return [
    {
      lane: "browser",
      title: "You type the prompt",
      where: "components/ChatScreen.tsx",
      summary: <p>You type in the chat box and press Send.</p>,
      data: <Data label="your text" value={t.userText} />,
    },
    {
      lane: "browser",
      title: "useChat sends the conversation",
      where: "useChat · AI SDK",
      summary: (
        <p>
          Your text becomes a <b>UIMessage</b>. useChat POSTs <b>all {request?.messages?.length ?? "?"} messages</b> to <Mono>/api/chat</Mono>: the
          server keeps no memory between requests.
        </p>
      ),
      data: <Data label="POST /api/chat · request body" value={pretty(request ?? t.requestBody)} />,
    },
    {
      lane: "server",
      title: "The route receives it",
      where: "app/api/chat/route.ts",
      summary: <p>Next.js maps the URL to this file. It only reads the JSON and hands the messages to the agent.</p>,
      data: <Data label="route.ts" value={`export async function POST(req) {\n  const { messages } = await req.json();\n  return streamAgentReply(messages);   // → server/agent.ts\n}`} />,
    },
    {
      lane: "server",
      title: s?.editMode ? `Current page (v${v}) is attached` : "Nothing to attach yet",
      where: "server/agent.ts · lib/spec.ts · buildUserPrompt",
      summary: s?.editMode ? (
        <p>
          The page is rebuilt from the earlier answers and wrapped around your request, so the LLM <b>edits</b> it instead of starting over.
        </p>
      ) : (
        <p>First request: there is no page yet, so your prompt goes to the LLM unchanged.</p>
      ),
      data: <Data label="the user message the LLM receives" value={s?.sentPrompt ?? t.userText} />,
    },
    {
      lane: "server",
      title: "Instructions from the catalog",
      where: "lib/catalog.ts · catalog.prompt()",
      summary: (
        <>
          <p>
            json-render writes the system prompt from our <b>{buildCatalog(composites).componentNames.length} components</b> + <b>{RULES.length} rules</b>, and teaches
            the output format (JSON patch lines). {fmt(instructions.length)} characters.
          </p>
          <p>
            The <b>{composites.length} composites</b> (ProductCard, CartSummary…) are read from the database (<Mono>data/app.db</Mono>) on this request, so one
            added on /components is already here. See{" "}
            <Link href="/runtime-components" className="text-accent hover:underline">
              Runtime components
            </Link>
            .
          </p>
        </>
      ),
      data: <Data label="system instructions" value={instructions} />,
    },
    {
      lane: "server",
      title: "One HTTP call to OpenRouter",
      where: "streamText · @openrouter/ai-sdk-provider",
      summary: (
        <p>
          The AI SDK translates everything into OpenRouter&apos;s format (OpenAI-style): the first of the <Mono>messages</Mono>, role{" "}
          <Mono>system</Mono>, = step 5, the rest = the conversation. OpenRouter passes it on to the model&apos;s vendor. There is{" "}
          <b>no <Mono>tools</Mono> field</b>, so the model cannot call tools.
        </p>
      ),
      data: <Data label={`request body → ${call?.provider ?? "provider"} · ${call?.modelId ?? ""}`} value={pretty(shortenBody(body))} />,
    },
    {
      lane: "llm",
      title: "The LLM generates the answer",
      where: call?.modelId ?? "LLM",
      summary: (
        <p>
          It reads <b>{fmt(call?.inputTokens)} tokens</b> and predicts the answer token by token (<b>{fmt(call?.outputTokens)} tokens</b>), streaming
          as it goes. Finish reason: <Mono>{call?.finishReason ?? "?"}</Mono>.
        </p>
      ),
      data: (
        <div className="grid gap-3 md:grid-cols-2">
          <Compare title="This app · json-render" tone="emerald" active>
            <b>1 call.</b> The LLM writes <b>text</b>: a sentence, then JSON patch lines it learned from the instructions.
          </Compare>
          <Compare title="Alternative · tool calling" tone="slate">
            The LLM returns a <Mono>tool_calls</Mono> entry with the UI JSON; the server runs it and sends the result back: <b>2+ calls.</b>
          </Compare>
        </div>
      ),
    },
    {
      lane: "llm",
      title: "What the LLM returned (raw)",
      where: "LLM → server",
      summary: <p>Exactly what came back, before any processing: one sentence, then the patch lines in a <Mono>```spec</Mono> block.</p>,
      data: <Data label={`raw text · ${fmt(s?.rawOutput.length)} chars`} value={s?.rawOutput ?? "(not recorded)"} />,
    },
    {
      lane: "server",
      title: "Stream sorted for the browser",
      where: "pipeJsonRender · toUIMessageStream",
      summary: (
        <>
          <p>
            While it streams, the sentence becomes <Mono>text-delta</Mono> chunks and each JSON line one <Mono>data-spec</Mono> chunk, sent as
            Server-Sent Events.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(t.chunkCounts).map(([type, n]) => (
              <span key={type} className={`rounded-md px-2 py-0.5 font-mono text-xs ${type === "data-spec" ? "bg-fg text-page" : "bg-subtle text-muted"}`}>
                {type} × {n}
              </span>
            ))}
          </div>
        </>
      ),
      data: <Data label={`the wire · ${t.sseTotal} lines (text chunks grouped)`} value={(t.wire ?? []).join("\n")} />,
    },
    {
      lane: "browser",
      title: "useChat rebuilds the message",
      where: "useChat · AI SDK",
      summary: (
        <p>
          The chunks become one assistant message: a <Mono>text</Mono> part for the chat + <b>{patchCount} data-spec part{patchCount === 1 ? "" : "s"}</b>{" "}
          (the patches).
        </p>
      ),
      data: <Data label="message.parts" value={pretty(t.parts.filter((p) => (p as { type: string }).type !== "step-start"))} />,
    },
    {
      lane: "browser",
      title: s?.editMode ? `Patches applied: v${v} → v${v + 1}` : `Patches applied → v${v + 1}`,
      where: "lib/spec.ts · applySpecPatch",
      summary: <p>Each patch (add / replace / remove) is applied in order. The result is the page JSON: a flat map of elements that point to their children.</p>,
      data: t.specBefore ? (
        <div className="grid gap-3 2xl:grid-cols-2">
          <Data label={`before · v${v}`} value={pretty(t.specBefore)} />
          <Data label={`after · v${v + 1}`} value={pretty(t.specAfter)} />
        </div>
      ) : (
        <Data label={`page JSON · v${v + 1}`} value={pretty(t.specAfter)} />
      ),
    },
    {
      lane: "browser",
      title: "Validation",
      where: "lib/validate.ts",
      summary: <p>Three checks: structure (validateSpec), props against the Zod schemas (catalog.validate), and our own rules.</p>,
      data:
        t.problems.length === 0 ? (
          <p className="text-sm text-fg">Valid: no problems found.</p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-sm text-fg">
            {t.problems.map((p) => <li key={p}>{p}</li>)}
          </ul>
        ),
    },
    {
      lane: "browser",
      title: "JSON mapped to React components",
      where: "<Renderer> · components/registry.tsx",
      summary: (
        <p>
          Starting at <Mono>root</Mono>, each element&apos;s <Mono>type</Mono> is looked up in the registry and rendered with its props, children inside
          their parent.
        </p>
      ),
      data: t.specAfter && (
        <div className="grid gap-4 2xl:grid-cols-2">
          <Mapping spec={t.specAfter} />
          <div className="overflow-hidden rounded-lg border border-line">
            <p className="border-b border-line bg-subtle px-3 py-1.5 text-xs text-muted">rendered result</p>
            {/* The saved sample uses FlashDealCard, which the database only has after you add it on /components. */}
            <Preview spec={t.specAfter} streaming={false} composites={withDemoCard(composites)} />
          </div>
        </div>
      ),
    },
  ];
}

/* ================================================================== */
/* Why the Vercel AI SDK                                               */
/* ================================================================== */

const SDK_BENEFITS: { title: string; steps: number[]; what: ReactNode; without: string }[] = [
  {
    title: "One API for every model",
    steps: [6],
    what: (
      <>
        <Mono>openrouter(&quot;google/gemini-…&quot;)</Mono> today; Claude or GPT is a one-line change. The SDK translates to each provider&apos;s format.
      </>
    ),
    without: "Rewrite the request and response handling for every provider.",
  },
  {
    title: "Streaming, end to end",
    steps: [6, 9, 10],
    what: (
      <>
        <Mono>streamText</Mono> → <Mono>toUIMessageStream</Mono> → <Mono>useChat</Mono>: words and UI patches appear while the model is still
        writing.
      </>
    ),
    without: "Parse the provider's stream, invent a wire format, and decode it again in React.",
  },
  {
    title: "Chat state in React",
    steps: [1, 2, 10],
    what: (
      <>
        <Mono>useChat</Mono> keeps the messages, status (submitted / streaming / ready) and errors, and sends the conversation.
      </>
    ),
    without: "Hand-written state management, request code and error handling.",
  },
  {
    title: "Custom data parts",
    steps: [9, 10],
    what: (
      <>
        Typed parts like <Mono>data-spec</Mono> travel next to the text. This is the hook json-render plugs into (<Mono>pipeJsonRender</Mono>).
      </>
    ),
    without: "A separate channel to send UI data next to the chat text.",
  },
  {
    title: "Agent features, ready when needed",
    steps: [7],
    what: (
      <>
        Tools, multi-step loops (<Mono>stopWhen</Mono>) and structured output are built in: not needed here, but a tool-calling variant is a small change.
      </>
    ),
    without: "Build the tool loop (call, run, send result, repeat) yourself.",
  },
  {
    title: "Visibility into every call",
    steps: [6, 7],
    what: (
      <>
        <Mono>onStepEnd</Mono>, token usage and the exact request body: this whole page is built from them.
      </>
    ),
    without: "Wrap and log every HTTP call manually.",
  },
];

const ALTERNATIVES: { name: string; is: string; why: string }[] = [
  {
    name: "Provider SDK directly (e.g. @google/genai)",
    is: "The model vendor's own client",
    why: "One provider only, and no browser side: streaming to React, chat state and the wire format would all be hand-written.",
  },
  {
    name: "LangChain.js / LangGraph.js",
    is: "Agent orchestration frameworks",
    why: "Strong for complex multi-agent graphs, but heavier than this app needs, and json-render's helpers expect the AI SDK stream.",
  },
  {
    name: "Python frameworks (Pydantic AI, LangGraph, Google ADK)",
    is: "Agent frameworks in Python",
    why: "The UI must stay React anyway, json-render's server helpers are TypeScript-only, and it means two languages and two servers.",
  },
  {
    name: "CopilotKit",
    is: "Full in-app copilot framework (AG-UI protocol)",
    why: "More built in, but more opinionated: its own runtime and structure. For a demo we wanted to see and control every step.",
  },
  {
    name: "A2UI",
    is: "A UI JSON format / protocol (Google)",
    why: "Not an LLM toolkit: it still needs something like the AI SDK to call the model. It plays the role json-render plays here.",
  },
  {
    name: "assistant-ui",
    is: "React components for chat interfaces",
    why: "A chat UI layer, not an engine; it can even run on top of the AI SDK. Our canvas needed a custom UI anyway.",
  },
];

function WhyAiSdk() {
  return (
    <section id="why-ai-sdk" className="scroll-mt-16 space-y-8 border-t border-line pt-8">
      <div className="space-y-2">
        <h2 className="text-lg font-medium tracking-tight text-fg">Why the Vercel AI SDK</h2>
        <p className="max-w-3xl text-sm leading-relaxed">
          The AI SDK is an open-source TypeScript <b>toolkit</b> for AI apps: it handles talking to the model, streaming and chat state, on any Node
          server. json-render handles the generative-UI part. In this request the SDK did six jobs:
        </p>
      </div>

      <div className="grid gap-x-8 gap-y-6 md:grid-cols-2 2xl:grid-cols-3">
        {SDK_BENEFITS.map((b) => (
          <div key={b.title} className="flex flex-col border-t border-line pt-4">
            <div className="mb-2 flex flex-wrap items-baseline gap-2">
              <p className="text-sm font-medium text-fg">{b.title}</p>
              {b.steps.map((n) => (
                <a key={n} href={`#step-${n}`} className="font-mono text-xs text-muted hover:text-fg">
                  {String(n).padStart(2, "0")}
                </a>
              ))}
            </div>
            <p className="flex-1 text-sm leading-relaxed">{b.what}</p>
            <p className="mt-2 text-xs text-muted">Without it: {b.without}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-fg">Why not the alternatives?</h3>
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="bg-subtle text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Option</th>
                <th className="px-4 py-2 font-medium">What it is</th>
                <th className="px-4 py-2 font-medium">Why not for this app</th>
              </tr>
            </thead>
            <tbody>
              {ALTERNATIVES.map((a) => (
                <tr key={a.name} className="border-t border-line align-top">
                  <td className="px-4 py-2.5 font-medium text-fg">{a.name}</td>
                  <td className="px-4 py-2.5 text-muted">{a.is}</td>
                  <td className="px-4 py-2.5">{a.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Compare title="Not locked in" tone="emerald">
          Open source, runs on any Node host (not only Vercel), and models are swappable providers.
        </Compare>
        <Compare title="Trade-off: TypeScript" tone="slate">
          No Python version. A Python backend can still feed <Mono>useChat</Mono>, but the agent would then be a Python library.
        </Compare>
        <Compare title="Trade-off: json-render is young" tone="slate">
          Vercel Labs, pre-1.0 (pinned to 0.21.1): APIs may change between versions.
        </Compare>
      </div>
    </section>
  );
}

/* ================================================================== */
/* Building blocks                                                     */
/* ================================================================== */

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tracking-tight text-fg">{value}</dd>
      <dd className="truncate text-xs text-muted">{note}</dd>
    </div>
  );
}

function Compare({ title, tone, active, children }: { title: string; tone: "emerald" | "slate"; active?: boolean; children: ReactNode }) {
  return (
    <div className={`rounded-lg border p-4 ${tone === "emerald" ? "border-fg/30" : "border-line"}`}>
      <p className="mb-1.5 flex items-center gap-2 text-sm font-medium text-fg">
        {title} {active && <span className="text-xs font-normal text-muted">· used here</span>}
      </p>
      <p className="text-sm text-fg">{children}</p>
    </div>
  );
}

/** Element tree: key → type → registry component, indented by depth. */
function Mapping({ spec }: { spec: Spec }) {
  const rows: { depth: number; key: string; type: string; props: string }[] = [];
  const visit = (key: string, depth: number) => {
    const el = spec.elements[key];
    if (!el) return;
    const props = Object.entries(el.props ?? {})
      .filter(([, v]) => v !== null && typeof v !== "object")
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join(", ");
    rows.push({ depth, key, type: el.type, props });
    childKeys(el).forEach((c) => visit(c, depth + 1));
  };
  visit(spec.root, 0);

  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[36rem] text-left text-xs">
        <thead className="bg-subtle text-muted">
          <tr>
            <th className="px-3 py-2 font-medium whitespace-nowrap">element (from the LLM)</th>
            <th className="px-3 py-2 font-medium">type</th>
            <th className="px-3 py-2 font-medium">rendered by</th>
            <th className="px-3 py-2 font-medium">props</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t border-line hover:bg-subtle">
              <td className="px-3 py-1.5 font-mono whitespace-nowrap text-fg" style={{ paddingLeft: `${0.75 + r.depth * 1.25}rem` }}>
                {r.depth > 0 && <span className="text-muted">└ </span>}
                {r.key}
              </td>
              <td className="px-3 py-1.5 font-medium text-fg">{r.type}</td>
              <td className="px-3 py-1.5 font-mono text-muted">registry.{r.type}</td>
              <td className="max-w-xs truncate px-3 py-1.5 text-muted">{r.props}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Which section is currently on screen ("step-3", "why-ai-sdk"…): drives the timeline highlight. */
function useActiveSection(count: number) {
  const [active, setActive] = useState("step-1");
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-10% 0px -60% 0px" },
    );
    const ids = [...Array.from({ length: count }, (_, i) => `step-${i + 1}`), "why-ai-sdk"];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [count]);
  return active;
}

/* ---------- helpers ---------- */

/** OpenRouter's body (OpenAI style); the sample traces were recorded with Google's (systemInstruction). */
type ProviderBody = {
  messages?: { role?: string; content?: { type?: string; text?: string }[] }[];
  systemInstruction?: { parts?: { text?: string }[] };
} & Record<string, unknown>;

/** The server stores the system instruction shortened; point to step 5 for the full text. */
function shortenBody(body: ProviderBody | undefined) {
  if (!body) return "(not recorded)";
  const [first, ...rest] = body.messages ?? [];
  const system = first?.role === "system" ? first.content?.[0]?.text : undefined;
  const text = system ?? body.systemInstruction?.parts?.[0]?.text ?? "";
  const chars = /^\[(\d+) characters/.exec(text)?.[1];
  const label = chars ? `[${fmt(Number(chars))} characters: full text in step 5]` : `${text.slice(0, 160)}… [full text in step 5]`;
  if (system !== undefined) return { ...body, messages: [{ ...first, content: [{ type: "text", text: label }] }, ...rest] };
  return { ...body, systemInstruction: { parts: [{ text: label }] } };
}

const withDemoCard = (composites: CompositeDef[]) =>
  composites.some((c) => c.type === FLASH_DEAL_CARD.type) ? composites : [...composites, FLASH_DEAL_CARD];
const pretty = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v, null, 2));
const fmt = (n: number | undefined) => (n === undefined ? "?" : n.toLocaleString("en-US"));
function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
