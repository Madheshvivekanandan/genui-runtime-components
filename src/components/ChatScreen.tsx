/**
 * FRONTEND · components/ChatScreen.tsx — the assistant screen (URL /). Runs in the BROWSER.
 *
 * Top: the shared TopBar.  Left: the chat.  Right: <Canvas>, the page being built.
 * The page itself is never stored separately — it is rebuilt from the chat
 * messages (lib/spec.ts), so every answer becomes a new version.
 * The pieces live in components/chat/: EmptyState, Messages, Composer, prompts.
 */
"use client"; // = "this file and everything it imports runs in the browser"

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@/components/Canvas";
import { Composer } from "@/components/chat/Composer";
import { EmptyState } from "@/components/chat/EmptyState";
import { Messages, textOf } from "@/components/chat/Messages";
import { EDITS, LAYOUT_EDITS } from "@/components/chat/prompts";
import { refreshComposites } from "@/components/compositeStore";
import { TopBar } from "@/components/TopBar";
import { captureFetch, saveTrace } from "@/components/traceStore";
import { specVersions } from "@/lib/spec";
import { MODEL_BUSY, type GenUIMessage } from "@/lib/trace";

// Same as useChat's default (POST /api/chat), plus a fetch that records
// every request/response for the How-it-works page.
const transport = new DefaultChatTransport<GenUIMessage>({
  api: "/api/chat",
  fetch: captureFetch,
  // Don't send the traces (message metadata) back: the server doesn't need them.
  prepareSendMessagesRequest: ({ id, messages, trigger, messageId, body }) => ({
    body: { ...body, id, trigger, messageId, messages: messages.map((m) => ({ ...m, metadata: undefined })) },
  }),
});

export function ChatScreen() {
  const [input, setInput] = useState("");
  const [picked, setPicked] = useState<number | null>(null); // null = follow the latest version
  const retried = useRef(false); // asked again by ourselves after the model went quiet or was overloaded (once per message)
  const { messages, sendMessage, setMessages, status, error, stop, regenerate } = useChat<GenUIMessage>({
    transport,
    onError: (e) => {
      if (!e.message.startsWith(MODEL_BUSY) || retried.current) return;
      retried.current = true;
      setTimeout(() => void regenerate(), 0); // after useChat has finished with the failed request
    },
    onFinish: ({ message, messages, isError }) => {
      if (isError) return;
      retried.current = false;
      // The server answered with the latest composites: catch up before validating (one may have been added meanwhile).
      void refreshComposites().then(() => saveTrace(message, messages));
    },
  });

  const busy = status === "submitted" || status === "streaming";
  const versions = useMemo(() => specVersions(messages), [messages]);
  const selectedIndex = picked ?? versions.length - 1;
  const latest = versions.at(-1)?.spec;
  const usesComposites = !!latest && Object.values(latest.elements).some((el) => el.slots); // elements with named slots

  // Keep the newest message in view while the answer streams in.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const send = (text: string) => {
    if (!text.trim() || busy) return;
    setPicked(null); // jump back to the newest version
    retried.current = false;
    sendMessage({ text });
    setInput("");
  };

  const lastMessage = messages.at(-1);
  const waiting = status === "submitted" || (status === "streaming" && lastMessage?.role === "assistant" && !textOf(lastMessage));

  return (
    <div className="flex h-dvh flex-col bg-page text-fg">
      <TopBar current="/" newTab>
        <button
          onClick={() => (setMessages([]), setPicked(null))}
          disabled={busy || messages.length === 0}
          className="text-muted transition hover:text-fg disabled:opacity-40"
        >
          New chat
        </button>
      </TopBar>

      <div className="flex min-h-0 flex-1">
        {/* ---------- LEFT: chat ---------- */}
        <aside className="flex w-[400px] shrink-0 flex-col border-r border-line">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6">
            {messages.length === 0 ? (
              <EmptyState onPick={send} />
            ) : (
              <Messages messages={messages} versions={versions} selectedIndex={selectedIndex} busy={busy} waiting={waiting} onPickVersion={setPicked} />
            )}
            {error && (
              <div className="mt-6 text-sm">
                <p className="text-fg">Something went wrong.</p>
                <p className="mt-0.5 text-xs break-words text-muted">{error.message}</p>
                <button onClick={() => regenerate()} className="mt-2 text-xs text-fg underline underline-offset-4">
                  Try again
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3 px-5 pb-5">
            {versions.length > 0 && !busy && (
              <ul className="divide-y divide-line border-y border-line">
                {(usesComposites ? LAYOUT_EDITS : EDITS).map((e) => (
                  <li key={e}>
                    <button onClick={() => send(e)} className="block w-full py-2 text-left text-sm text-fg hover:underline hover:underline-offset-4">
                      {e}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Composer
              value={input}
              onChange={setInput}
              onSend={() => send(input)}
              onStop={stop}
              busy={busy}
              placeholder={versions.length ? "Ask for a change" : "Ask the assistant"}
            />
          </div>
        </aside>

        {/* ---------- RIGHT: the page being built ---------- */}
        <Canvas versions={versions} selectedIndex={selectedIndex} onSelect={setPicked} streaming={busy && picked === null} />
      </div>
    </div>
  );
}
