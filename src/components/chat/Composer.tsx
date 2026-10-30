/**
 * FRONTEND · components/chat/Composer.tsx — the message box at the bottom of the chat.
 *
 * Grows with its text, Enter sends (Shift + Enter for a new line), and the
 * button turns into Stop while the assistant answers.
 */
import { useEffect, useRef } from "react";

type Props = { value: string; onChange: (v: string) => void; onSend: () => void; onStop: () => void; busy: boolean; placeholder: string };

export function Composer({ value, onChange, onSend, onStop, busy, placeholder }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  return (
    <form
      onSubmit={(e) => (e.preventDefault(), onSend())}
      className="flex items-end gap-2 rounded-xl border border-line bg-page p-1.5 pl-3 transition focus-within:border-muted"
    >
      <textarea
        ref={ref}
        rows={1}
        value={value}
        aria-label="Message"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            onSend();
          }
        }}
        placeholder={placeholder}
        className="max-h-40 flex-1 resize-none bg-transparent py-1.5 text-sm text-fg outline-none placeholder:text-muted"
      />
      {busy ? (
        <button type="button" onClick={onStop} aria-label="Stop" className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-fg text-page">
          <span className="size-2.5 rounded-[2px] bg-current" />
        </button>
      ) : (
        <button disabled={!value.trim()} aria-label="Send" className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-fg text-page disabled:opacity-25">
          <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" />
          </svg>
        </button>
      )}
    </form>
  );
}
