/**
 * FRONTEND · components/library/AtomPicker.tsx — which components a slot may hold.
 *
 * Shows only the chosen ones (click one to remove it). "+ Add" opens the
 * rest of the list, so a slot row stays one short line until you need more.
 */
"use client";

import { useState } from "react";

export function AtomPicker({ options, value, onChange }: { options: string[]; value: string[]; onChange: (next: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const rest = options.filter((t) => !value.includes(t));
  const chip = "rounded-md px-2 py-1 font-mono text-xs";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {value.map((t) => (
        <button key={t} onClick={() => onChange(value.filter((a) => a !== t))} title={`Remove ${t}`} className={`${chip} bg-fg text-page`}>
          {t}
        </button>
      ))}
      {rest.length > 0 && (
        <button onClick={() => setOpen(!open)} aria-expanded={open} className="px-1 py-1 text-xs text-muted hover:text-fg">
          {open ? "Done" : "+ Add"}
        </button>
      )}
      {open && (
        <div className="flex basis-full flex-wrap gap-1.5 pt-1">
          {rest.map((t) => (
            <button key={t} onClick={() => onChange([...value, t])} className={`${chip} bg-subtle text-muted hover:text-fg`}>
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
