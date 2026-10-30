/**
 * FRONTEND · components/chat/EmptyState.tsx — what the chat shows before the first message.
 *
 * A one-line question and the ready-made prompts as a plain list.
 */
import { SUGGESTIONS } from "./prompts";

export function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex min-h-full flex-col justify-end gap-6 pb-2">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-fg">What are you shopping for?</h1>
        <p className="mt-1 text-sm text-muted">Answers come back as product UI, built from the component catalog.</p>
      </div>
      <ul className="divide-y divide-line border-y border-line">
        {SUGGESTIONS.map((s) => (
          <li key={s.label}>
            <button onClick={() => onPick(s.text)} className="group block w-full py-2.5 text-left">
              <span className="block text-xs text-muted">{s.label}</span>
              <span className="block text-sm text-fg group-hover:underline group-hover:underline-offset-4">{s.text}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
