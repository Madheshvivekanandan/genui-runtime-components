/**
 * FRONTEND · components/screen/SlotRegion.tsx — how one slot arranges its items.
 *
 * The slot's `style` (from the definition) picks the arrangement:
 *   stack   : one under another
 *   row     : side by side, wrapping (buttons, badges)
 *   wrap    : chips that wrap (tags)
 *   columns : side by side with divider lines
 *   grid    : cards side by side, wrapping to the next line on narrow screens
 */
"use client";

import type { CSSProperties, ReactNode } from "react";
import type { SlotRule } from "@/lib/composites";

const COLUMN = "min-w-0 border-[var(--border)] pr-4 [&:not(:first-child)]:border-l [&:not(:first-child)]:pl-4";

export function SlotRegion({ slot, style, gap, nodes }: { slot: string; style: SlotRule["style"]; gap: string; nodes: ReactNode[] }) {
  if (nodes.length === 0) return null;
  const marks = { "data-slot": slot, "data-slot-style": style }; // for the component highlighter

  if (style === "columns") {
    return (
      <div
        {...marks}
        data-frame-part={`columns:${slot}`}
        style={{ "--cols": nodes.length } as CSSProperties}
        className="grid grid-cols-[repeat(var(--cols),minmax(0,1fr))] gap-y-6"
      >
        {nodes.map((n, i) => (
          <div key={i} className={COLUMN}>
            {n}
          </div>
        ))}
      </div>
    );
  }
  if (style === "grid") return <div {...marks} className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-4">{nodes}</div>;
  if (style === "wrap") return <div {...marks} className="flex flex-wrap gap-2">{nodes}</div>;
  if (style === "row") return <div {...marks} className="flex flex-wrap items-center gap-2">{nodes}</div>;
  return <div {...marks} className={`flex flex-col ${gap}`}>{nodes}</div>;
}
