/**
 * FRONTEND · components/chat/Messages.tsx — the conversation.
 *
 * Your messages sit in a light grey bubble on the right; the assistant's are
 * plain text. An answer that built a page links to that version on the canvas.
 */
import type { GenUIMessage } from "@/lib/trace";
import type { Version } from "@/lib/spec";

type Props = {
  messages: GenUIMessage[];
  versions: Version[];
  selectedIndex: number;
  busy: boolean;
  waiting: boolean;
  onPickVersion: (index: number) => void;
};

export const textOf = (m: GenUIMessage) => m.parts.map((p) => (p.type === "text" ? p.text : "")).join("").trim();

export function Messages({ messages, versions, selectedIndex, busy, waiting, onPickVersion }: Props) {
  const lastId = messages.at(-1)?.id;
  return (
    <div className="space-y-6">
      {messages.map((m) => {
        const text = textOf(m);
        if (m.role === "user") {
          return (
            <p key={m.id} className="ml-auto w-fit max-w-[85%] rounded-2xl bg-subtle px-3.5 py-2 text-sm whitespace-pre-wrap text-fg">
              {text}
            </p>
          );
        }
        const v = versions.findIndex((x) => x.messageId === m.id);
        if (!text && v < 0) return null; // still waiting: the "Thinking…" line covers it
        const trace = m.metadata?.trace;
        const timing = trace && `${trace.model} · ${(trace.durationMs / 1000).toFixed(1)}s${trace.editMode ? " · edit" : ""}`;
        return (
          <div key={m.id} className="space-y-2 text-sm">
            {text && <p className="leading-relaxed whitespace-pre-wrap text-fg">{text}</p>}
            {v >= 0 && (
              <button onClick={() => onPickVersion(v)} title={timing || undefined} className="flex min-h-7 items-center gap-2 text-xs text-muted hover:text-fg">
                <span className="font-mono">v{v + 1}</span>
                <span>{busy && m.id === lastId ? "Building…" : v === 0 ? "Page created" : "Page updated"}</span>
                <span className={v === selectedIndex ? "text-fg" : ""}>{v === selectedIndex ? "· Showing" : "· Show"}</span>
              </button>
            )}
          </div>
        );
      })}
      {waiting && <p className="animate-pulse text-sm text-muted">Thinking…</p>}
    </div>
  );
}
