/**
 * FRONTEND · components/screen/CompositeFrame.tsx — ONE frame draws every composite.
 *
 * Composites are NOT code: their definitions (lib/composites.ts, stored in
 * the database, server/db.ts) are drawn here. The frame places the named slots in
 * the order of the layout the AI picked. Each layout writes the slots into
 * the DOM in the order you see them, so screen readers and Tab follow the
 * visual order (reordering with CSS `order` would fail WCAG 1.3.2).
 *
 * This is why a composite added at runtime needs no deploy: a new JSON entry
 * is just another `def` handed to this same component.
 *
 * What the frame draws itself (card, dividers, column lines, tab, toggle) is
 * marked with data-frame-part, and each slot region with data-slot and
 * data-slot-style, so the canvas inspector and highlighter can point at them.
 */
"use client";

import { Children, useContext, useState, type ReactNode } from "react";
import { DIVIDER, isCollection, type CompositeDef } from "@/lib/composites";
import { FrameContext, NO_LABEL, ScopeContext, useLabelsOn, type Scope } from "./context";
import { SlotRegion } from "./SlotRegion";

const GAP = { panel: "gap-3", accordion: "gap-3", plain: "gap-5" };
// Padding, not margin: the divider wrapper should be easy to hover in the inspector.
const DIVIDER_SPACE = { panel: "py-1", accordion: "py-1", plain: "py-1" };
// A white card told apart from the page by a hairline border: no shadow, no fill.
const CARD = "rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5";

export function CompositeFrame({ def, layout, slots }: { def: CompositeDef; layout: string; slots?: Record<string, ReactNode> }) {
  const parent = useContext(ScopeContext);
  const labelsOn = useLabelsOn();
  const [open, setOpen] = useState(true);
  const order = def.layouts[layout] ?? Object.values(def.layouts)[0] ?? [];
  const tabSlot = Object.keys(def.slots).find((s) => def.slots[s].style === "tab");
  // The first slot with content, in DOM order (the tab comes first on an accordion).
  const leadSlot = [tabSlot, ...order].find((s) => s && s !== DIVIDER && Children.toArray(slots?.[s]).length > 0);

  const scopeFor = (slot: string, index: number): Scope => {
    if (parent.item) {
      // This composite is item i of a parent's repeating slot (e.g. products[1]): label only its first atom.
      if (slot !== leadSlot || index !== 0) return NO_LABEL;
      const { slot: s, index: i } = parent.item;
      return { label: (field) => (i === 0 ? `${s}[0].${field}` : `${s}[${i}]`) };
    }
    if (isCollection(def.slots[slot])) return { label: (field) => (index === 0 ? `${slot}[].${field}` : null), item: { slot, index } };
    const prefix = def.screenSlot ?? def.name;
    return { label: (field) => `${prefix}.${field}` };
  };

  const fill = (slot: string) =>
    Children.toArray(slots?.[slot]).map((node, i) => (
      <ScopeContext.Provider key={i} value={scopeFor(slot, i)}>
        {node}
      </ScopeContext.Provider>
    ));

  const tab = tabSlot ? fill(tabSlot) : [];
  const flow = order.map((entry, i) =>
    entry === DIVIDER ? (
      // The wrapper carries the spacing, so hovering near the line counts as hovering it.
      <div key={i} data-frame-part="divider" className={DIVIDER_SPACE[def.frame]}>
        <hr className="border-[var(--border)]" />
      </div>
    ) : (
      <SlotRegion key={i} slot={entry} style={def.slots[entry]?.style ?? "stack"} gap={GAP[def.frame]} nodes={fill(entry)} />
    ),
  );
  const slotLine = labelsOn && def.screenSlot && (
    <p
      data-frame-part="slot-label"
      title={`layout: ${layout}`}
      className="w-fit rounded bg-accent/10 px-1.5 py-0.5 font-slot text-xs font-medium text-accent"
    >
      SLOT · {def.screenSlot} → {def.name}
    </p>
  );

  let body: ReactNode;
  if (def.frame === "plain") {
    body = <div className={`flex flex-col ${GAP.plain}`}>{flow}</div>;
  } else if (def.frame === "panel") {
    body = (
      <section data-frame-part="card" className={`flex flex-col ${CARD} ${GAP.panel}`}>
        {slotLine}
        {flow}
      </section>
    );
  } else {
    // Accordion: the first slot of the layout stays visible next to the toggle; the rest collapses.
    const first = flow.findIndex((node, i) => order[i] !== DIVIDER && node);
    body = (
      <div>
        <section data-frame-part="card" className={CARD}>
          {/* The tab: a quiet label above the content, not a floating pill. */}
          {tab.length > 0 && (
            <div data-frame-part={`tab:${tabSlot}`} className="mb-2 w-fit">
              {tab}
            </div>
          )}
          <div className="flex items-start gap-4">
            <div className={`flex min-w-0 flex-1 flex-col ${GAP.accordion}`}>
              {slotLine}
              {first >= 0 && flow[first]}
            </div>
            <button
              type="button"
              data-frame-part="toggle"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-label={open ? "Collapse" : "Expand"}
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-[var(--muted)] transition hover:bg-[var(--soft)]"
            >
              <svg viewBox="0 0 24 24" className={`size-4 transition ${open ? "" : "rotate-180"}`} fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 15 12 9 18 15" />
              </svg>
            </button>
          </div>
          {open && <div className={`mt-3 flex flex-col ${GAP.accordion}`}>{flow.slice(first + 1)}</div>}
        </section>
      </div>
    );
  }
  return <FrameContext.Provider value={def.frame}>{body}</FrameContext.Provider>;
}
