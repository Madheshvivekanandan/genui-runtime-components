/**
 * FRONTEND · components/Inspector.tsx — the canvas "Split" view: the page and its JSON, linked.
 *
 *   Hover the page  → after a short pause, the element under the mouse is outlined
 *                     and its JSON lines light up. The highlight stays when the
 *                     mouse leaves the page, so you can go and scroll the JSON.
 *   The JSON        → doesn't react to hover (scroll it freely); click a block to pin it
 *   Click           → pin it. The card above the JSON explains what it is: an atom
 *                     (code), a composite (data: slots, layouts, atoms inside) or a
 *                     built-in component, and which parts the frame draws itself.
 *                     "Show its pieces" outlines each atom of that component on the
 *                     page (Highlighter.tsx). Click the page background to unpin.
 *
 * How the page knows which element is where: json-render's devtools mode
 * (markDevtoolsActive) wraps every rendered element in
 * <span data-jr-key="<element key>" style="display:contents">. Frame parts that
 * aren't elements (dividers, column lines, tab, toggle) carry data-frame-part.
 */
"use client";

import { markDevtoolsActive, type Spec } from "@json-render/core";
import { memo, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { ALL, HighlightLegend, useHighlight } from "@/components/Highlighter";
import { ATOM_TYPES } from "@/lib/catalog";
import { DIVIDER, type CompositeDef } from "@/lib/composites";
import { childKeys, descendantKeys } from "@/lib/spec";

type Box = { left: number; top: number; width: number; height: number };
type Target = { key: string; part: string | null };
type Lit = { target: Target; box: Box; parts: { part: string; box: Box }[] };
type Line = { text: string; key: string | null; ref: string | null };

const PART_LABEL: Record<string, string> = { divider: "divider (frame)", columns: "column lines (frame)", tab: "tab (frame)", toggle: "toggle (frame)" };
// How long the mouse must rest on an element before it takes the highlight: passing over
// other elements on the way to the JSON doesn't steal it.
const HOVER_DELAY_MS = 200;

export function SplitView({
  spec,
  composites,
  highlightAll,
  children,
}: {
  spec: Spec;
  composites: CompositeDef[];
  highlightAll: boolean; // the canvas "Show: Components" switch
  children: ReactNode;
}) {
  useEffect(() => markDevtoolsActive(), []); // tag every rendered element with its key (see top)
  const previewRef = useRef<HTMLDivElement>(null);
  const jsonRef = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState<{ hover: Lit | null; pinned: Lit | null }>({ hover: null, pinned: null });
  const [pending, setPending] = useState<Target | null>(null); // under the mouse, not highlighted yet
  const [pieces, setPieces] = useState<string | null>(null); // "Show its pieces" for this element
  const highlight = useHighlight(spec, composites, highlightAll ? ALL : pieces);
  const lines = useMemo(() => jsonLines(spec), [spec]);

  useEffect(() => {
    if (!pending) return;
    const id = window.setTimeout(() => {
      setLit((prev) => ({ hover: measure(previewRef.current, pending), pinned: measure(previewRef.current, prev.pinned?.target ?? null) }));
      revealLine(jsonRef.current, pending.key);
    }, HOVER_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [pending]);

  const shown = lit.pinned?.target ?? lit.hover?.target ?? null;
  const focusKey = lit.hover?.target.key ?? lit.pinned?.target.key ?? null;
  const inside = useMemo(() => (focusKey ? descendantKeys(spec, focusKey) : new Set<string>()), [spec, focusKey]);

  const show = (hover: Target | null, pinned: Target | null) => {
    const next = { hover: measure(previewRef.current, hover), pinned: measure(previewRef.current, pinned) };
    if (JSON.stringify(next) !== JSON.stringify(lit)) setLit(next);
  };

  const targetAt = (e: MouseEvent): Target | null => {
    const el = e.target as Element;
    const span = el.closest("[data-jr-key]");
    if (!span) return null;
    const part = el.closest("[data-frame-part]");
    // A part nearer than the element's own span is something the frame drew (e.g. a divider).
    return { key: span.getAttribute("data-jr-key")!, part: part && span.contains(part) ? part.getAttribute("data-frame-part") : null };
  };

  const onPreviewMove = (e: MouseEvent) => {
    const target = targetAt(e);
    // The page background never takes the highlight, so crossing it on the way to the JSON is harmless.
    if (!target || target.key === spec.root || sameTarget(target, lit.hover?.target)) return setPending(null);
    if (!sameTarget(target, pending)) setPending(target);
  };

  const onPreviewClick = (e: MouseEvent) => {
    const target = targetAt(e);
    setPending(null);
    if (!target || target.key === spec.root) return show(lit.hover?.target ?? null, null); // background: unpin
    const same = sameTarget(target, lit.pinned?.target);
    show(target, same ? null : target);
    if (!same) revealLine(jsonRef.current, target.key);
  };

  const onJsonPick = (key: string) => show(lit.hover?.target ?? null, lit.pinned?.target.key === key ? null : { key, part: null });

  return (
    <div className="grid h-full grid-cols-[minmax(0,1fr)_minmax(22rem,0.8fr)]">
      <div
        ref={previewRef}
        onMouseMove={onPreviewMove}
        onMouseLeave={() => setPending(null)} // keep the highlight while you scroll the JSON
        onClick={onPreviewClick}
        className={`relative min-h-0 cursor-crosshair overflow-auto ${highlight.className ?? ""}`}
      >
        {highlight.styles}
        {children}
        {/* While the highlighter is on it already labels the frame parts: don't draw them twice. */}
        {lit.pinned && <Outline lit={lit.pinned} tone="pin" parts={!highlight.className} />}
        {lit.hover && lit.hover.target.key !== lit.pinned?.target.key && <Outline lit={lit.hover} tone="hover" parts={!highlight.className} />}
      </div>
      <div className="flex min-h-0 flex-col border-l border-line bg-page text-fg">
        <div className="max-h-[48%] shrink-0 overflow-auto border-b border-line">
          <InspectorCard
            spec={spec}
            target={shown}
            pinned={!!lit.pinned}
            composites={composites}
            onUnpin={() => show(null, null)}
            piecesShown={!!shown && pieces === shown.key}
            onTogglePieces={(key) => setPieces(pieces === key ? null : key)}
          />
        </div>
        <div ref={jsonRef} className="min-h-0 flex-1 overflow-auto">
          <JsonView lines={lines} focus={focusKey} pinned={lit.pinned?.target.key ?? null} inside={inside} onPick={onJsonPick} />
        </div>
      </div>
    </div>
  );
}

const sameTarget = (a: Target | null | undefined, b: Target | null | undefined) => !!a && !!b && a.key === b.key && a.part === b.part;

/** Where an element is on the page. Re-measured on every event: the page reflows while streaming or when an accordion collapses. */
function measure(container: HTMLElement | null, target: Target | null): Lit | null {
  const span = target && container?.querySelector(`[data-jr-key="${CSS.escape(target.key)}"]`);
  if (!container || !span || !target) return null;
  const range = document.createRange();
  range.selectNodeContents(span); // the span is display:contents: measure what it holds
  const parts = [...span.querySelectorAll("[data-frame-part]")]
    .filter((p) => p.closest("[data-jr-key]") === span) // this composite's parts, not a nested one's
    .map((p) => ({ part: p.getAttribute("data-frame-part")!, box: toBox(container, p.getBoundingClientRect()) }));
  return { target, box: toBox(container, range.getBoundingClientRect()), parts };
}

/** Scroll the JSON panel (not the page) so an element's first line sits a third of the way down, if it's off-screen. */
function revealLine(json: HTMLElement | null, key: string) {
  const line = json?.querySelector(`[data-line-key="${CSS.escape(key)}"]`);
  if (!json || !line) return;
  const c = json.getBoundingClientRect();
  const r = line.getBoundingClientRect();
  if (r.top < c.top || r.bottom > c.bottom) json.scrollTop += r.top - c.top - c.height / 3;
}

function toBox(container: HTMLElement, r: DOMRect): Box {
  const c = container.getBoundingClientRect();
  return { left: r.left - c.left + container.scrollLeft, top: r.top - c.top + container.scrollTop, width: r.width, height: r.height };
}

/** The outline on the page, its label, and (for a composite) the parts its frame draws. */
function Outline({ lit, tone, parts }: { lit: Lit; tone: "hover" | "pin"; parts: boolean }) {
  const color = tone === "pin" ? "#d946ef" : "#6366f1";
  const { box } = lit;
  return (
    <>
      <div className="pointer-events-none absolute z-10 rounded-md" style={{ ...box, outline: `2px solid ${color}`, outlineOffset: 2 }}>
        <span
          className="absolute left-0 rounded px-1.5 py-0.5 font-mono text-xs whitespace-nowrap text-fg shadow"
          style={{ background: color, top: box.top < 22 ? 4 : -22 }}
        >
          {lit.target.key}
        </span>
      </div>
      {(parts ? lit.parts : [])
        .filter((p) => PART_LABEL[p.part.split(":")[0]])
        .map((p, i) => {
          const active = lit.target.part === p.part;
          return (
            <div
              key={i}
              className={`pointer-events-none absolute z-10 rounded border-2 border-dashed ${active ? "border-amber-500 bg-amber-400/15" : "border-amber-500/60"}`}
              style={{ ...p.box, minHeight: 6 }}
            >
              <span className="absolute -top-5 right-0 rounded bg-amber-500 px-1 font-mono text-xs whitespace-nowrap text-white">
                {PART_LABEL[p.part.split(":")[0]]}
              </span>
            </div>
          );
        })}
    </>
  );
}

/* ---------- JSON ---------- */

/** The spec as formatted JSON, one line per row, each tagged with the element it belongs to. */
function jsonLines(spec: Spec): Line[] {
  const keyRef = (text: string) => {
    const m = /^\s*"([^"]+)",?$/.exec(text); // a bare key inside "children" or "slots"
    return m && spec.elements[m[1]] ? m[1] : null;
  };
  const lines: Line[] = [
    { text: "{", key: null, ref: null },
    { text: `  "root": ${JSON.stringify(spec.root)},`, key: null, ref: spec.root },
    { text: '  "elements": {', key: null, ref: null },
  ];
  const keys = Object.keys(spec.elements);
  keys.forEach((key, i) => {
    const body = JSON.stringify(spec.elements[key], null, 2).split("\n");
    body.forEach((l, j) => {
      const text = (j === 0 ? `    ${JSON.stringify(key)}: ` : "    ") + l + (j === body.length - 1 && i < keys.length - 1 ? "," : "");
      lines.push({ text, key, ref: j > 0 ? keyRef(l) : null });
    });
  });
  const rest = Object.entries(spec).filter(([k]) => k !== "root" && k !== "elements");
  lines.push({ text: rest.length ? "  }," : "  }", key: null, ref: null });
  rest.forEach(([k, v], i) =>
    JSON.stringify(v, null, 2)
      .split("\n")
      .forEach((l, j, all) => lines.push({ text: (j === 0 ? `  ${JSON.stringify(k)}: ` : "  ") + l + (j === all.length - 1 && i < rest.length - 1 ? "," : ""), key: null, ref: null })),
  );
  lines.push({ text: "}", key: null, ref: null });
  return lines;
}

// Memoised: mouse moves that only shift an outline don't re-render hundreds of lines.
const JsonView = memo(function JsonView({
  lines,
  focus,
  pinned,
  inside,
  onPick,
}: {
  lines: Line[];
  focus: string | null;
  pinned: string | null;
  inside: Set<string>;
  onPick: (key: string) => void;
}) {
  return (
    <pre className="py-2 font-mono text-xs leading-[1.6]">
      {lines.map((line, i) => {
        const key = line.ref ?? line.key; // a child reference points at that child
        const first = line.key && lines[i - 1]?.key !== line.key;
        const tint =
          line.key && line.key === pinned
            ? "bg-accent/25"
            : line.key && line.key === focus
              ? "bg-accent/15"
              : line.key && inside.has(line.key)
                ? "bg-accent/5"
                : "";
        return (
          <div
            key={i}
            data-line-key={first ? line.key : undefined}
            onClick={() => key && onPick(key)}
            className={`flex pr-3 ${tint}`}
          >
            <span className="w-10 shrink-0 pr-3 text-right text-muted select-none">{i + 1}</span>
            <code className="whitespace-pre">
              <Highlighted text={line.text} />
            </code>
          </div>
        );
      })}
    </pre>
  );
});

/** Minimal JSON colouring: keys, strings, numbers; the "type" value stands out. */
function Highlighted({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let last = 0;
  const isType = text.trimStart().startsWith('"type":');
  for (const m of text.matchAll(/("(?:[^"\\]|\\.)*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?)/g)) {
    out.push(text.slice(last, m.index));
    if (m[1]) {
      const cls = m[2] ? "text-fg" : isType ? "font-semibold text-fg" : "text-muted";
      out.push(<span key={m.index} className={cls}>{m[1]}</span>, m[2] ?? "");
    } else {
      out.push(<span key={m.index} className="text-accent">{m[0]}</span>);
    }
    last = m.index + m[0].length;
  }
  out.push(text.slice(last));
  return <>{out}</>;
}

/* ---------- Inspector card ---------- */

function InspectorCard({
  spec,
  target,
  pinned,
  composites,
  onUnpin,
  piecesShown,
  onTogglePieces,
}: {
  spec: Spec;
  target: Target | null;
  pinned: boolean;
  composites: CompositeDef[];
  onUnpin: () => void;
  piecesShown: boolean;
  onTogglePieces: (key: string) => void;
}) {
  const el = target ? spec.elements[target.key] : undefined;
  if (!target || !el) {
    return (
      <p className="p-4 text-xs leading-relaxed text-muted">
        Hover an element on the page and its JSON lights up; the highlight stays while you scroll the JSON. Click to pin an element and see
        what it&apos;s made of (click the background to unpin). Dashed
        <span className="mx-1 rounded border border-dashed border-amber-500 px-1 text-amber-600">boxes</span>
        are parts the component&apos;s frame draws itself; they aren&apos;t in the JSON.
      </p>
    );
  }
  const def = composites.find((c) => c.type === el.type);
  const kind = def ? "component · data" : (ATOM_TYPES as readonly string[]).includes(el.type) ? "atom · code" : "built-in · code";
  const props = Object.entries(el.props ?? {}).filter(([, v]) => v !== null);

  return (
    <div className="space-y-3 p-4 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <code className="text-sm font-semibold text-fg">{el.type}</code>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${def ? "border border-line text-fg" : "bg-subtle text-fg"}`}>
          {kind}
        </span>
        <code className="text-muted">{target.key}</code>
        {pinned && (
          <button onClick={onUnpin} className="ml-auto rounded px-1.5 py-0.5 text-muted hover:text-fg">
            Unpin
          </button>
        )}
      </div>
      <p className="font-mono text-xs text-muted">{path(spec, target.key)}</p>

      {def ? (
        <>
          <div className="space-y-2 rounded-md border border-line p-2.5">
            <button
              onClick={() => onTogglePieces(target.key)}
              className={`rounded-md px-2.5 py-1 font-medium ${piecesShown ? "bg-fg text-page" : "border border-line text-fg hover:bg-subtle"}`}
            >
              {piecesShown ? "Hide its pieces" : "◎ Show its pieces"}
            </button>
            <p className="text-muted">Outlines every atom this component is assembled from, and the parts it draws itself.</p>
            {piecesShown && <HighlightLegend />}
          </div>
          <CompositeDetails spec={spec} el={el} def={def} part={target.part} composites={composites} />
        </>
      ) : (
        <>
          <p className="text-muted">
            {kind.startsWith("atom")
              ? "The smallest piece of the screen design: React code in components/screen.tsx. The AI only fills its props."
              : "A component written in code (components/registry.tsx)."}
          </p>
          {props.length > 0 && (
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 font-mono text-xs">
              {props.map(([k, v]) => (
                <Row key={k} name={k} value={typeof v === "string" ? v : JSON.stringify(v)} />
              ))}
            </dl>
          )}
        </>
      )}
    </div>
  );
}

function CompositeDetails({
  spec,
  el,
  def,
  part,
  composites,
}: {
  spec: Spec;
  el: Spec["elements"][string];
  def: CompositeDef;
  part: string | null;
  composites: CompositeDef[];
}) {
  const layout = String((el.props as { layout?: string }).layout ?? Object.keys(def.layouts)[0]);
  const order = def.layouts[layout] ?? [];
  const atoms = countAtoms(spec, el, composites);
  const frameParts = [
    def.frame !== "plain" && { id: "card", text: `the ${def.frame} card: background, corners, padding` },
    order.includes(DIVIDER) && { id: "divider", text: `horizontal line${order.filter((e) => e === DIVIDER).length > 1 ? "s" : ""}: "divider" in layout ${layout}` },
    ...Object.entries(def.slots).map(([slot, r]) =>
      r.style === "columns" ? { id: `columns:${slot}`, text: `vertical lines: slot "${slot}" has the columns style` }
      : r.style === "tab" ? { id: `tab:${slot}`, text: `gradient tab: slot "${slot}" has the tab style` }
      : null,
    ),
    def.frame === "accordion" && { id: "toggle", text: "collapse button: the accordion frame" },
    def.screenSlot && { id: "slot-label", text: "the SLOT · … chip: a slot label, only when Slot labels is on" },
  ].filter((p): p is { id: string; text: string } => !!p);

  return (
    <div className="space-y-3">
      <p className="text-muted">
        Not React code: a definition stored in the database (edit it on /components), drawn by the generic frame. The AI chose the layout and filled the slots.
      </p>

      <Section title="Layout (the AI picks one)">
        <div className="flex flex-wrap gap-1.5">
          {Object.keys(def.layouts).map((name) => (
            <span key={name} className={`rounded-full px-2 py-0.5 font-mono text-xs ${name === layout ? "bg-fg text-page" : "bg-subtle text-muted"}`}>
              {name === layout ? "✓ " : ""}
              {name}
            </span>
          ))}
        </div>
        <p className="mt-1 font-mono text-xs text-muted">{order.join(" → ")}</p>
      </Section>

      <Section title="Slots · what the AI put in each · what the definition allows">
        <p className="mb-1 text-muted">Read-only: the same rule the validator checks.</p>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 font-mono text-xs">
          {Object.entries(def.slots).map(([slot, rule]) => {
            const types = (el.slots?.[slot] ?? []).map((k) => spec.elements[k]?.type).filter(Boolean);
            return (
              <Row
                key={slot}
                name={slot}
                value={`${summarize(types) || "empty"}   (${rule.min}–${rule.max} of ${rule.allow.join(", ")})`}
              />
            );
          })}
        </dl>
      </Section>

      <Section title="Atoms inside">
        <p className="font-mono text-xs text-fg">{summarize(atoms) || "none"}</p>
      </Section>

      <Section title="Drawn by the frame (not in the JSON)">
        <ul className="space-y-1">
          {frameParts.map((p) => (
            <li
              key={p.id}
              className={`rounded px-1.5 py-0.5 ${part && (part === p.id || (p.id === "divider" && part === "divider")) ? "bg-amber-500/15 text-fg" : "text-muted"}`}
            >
              ▸ {p.text}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted">{title}</p>
      {children}
    </div>
  );
}

function Row({ name, value }: { name: string; value: string }) {
  return (
    <>
      <dt className="text-fg">{name}</dt>
      <dd className="truncate text-fg" title={value}>
        {value}
      </dd>
    </>
  );
}

/** "ProductCard ×3" / "Eyebrow, Headline": types in order, repeats counted. */
function summarize(types: string[]): string {
  const counts = new Map<string, number>();
  for (const t of types) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts].map(([t, n]) => (n > 1 ? `${t} ×${n}` : t)).join(", ");
}

/** Every atom anywhere inside an element (through nested composites too). */
function countAtoms(spec: Spec, el: Spec["elements"][string], composites: CompositeDef[]): string[] {
  const out: string[] = [];
  const visit = (e: Spec["elements"][string]) => {
    for (const k of childKeys(e)) {
      const child = spec.elements[k];
      if (!child) continue;
      if ((ATOM_TYPES as readonly string[]).includes(child.type)) out.push(child.type);
      if (composites.some((c) => c.type === child.type) || childKeys(child).length) visit(child);
    }
  };
  visit(el);
  return out.sort((a, b) => ATOM_TYPES.indexOf(a as never) - ATOM_TYPES.indexOf(b as never));
}

/** Where an element sits: Page › ProductGrid [products] › ProductCard [price] › Price */
function path(spec: Spec, key: string): string {
  const parent = new Map<string, { key: string; slot: string | null }>();
  for (const [k, el] of Object.entries(spec.elements)) {
    for (const c of el.children ?? []) parent.set(c, { key: k, slot: null });
    for (const [slot, cs] of Object.entries(el.slots ?? {})) for (const c of cs) parent.set(c, { key: k, slot });
  }
  const steps: string[] = [];
  let current: string | undefined = key;
  let slot: string | null = null;
  for (let guard = 0; current && guard < 20; guard++) {
    steps.unshift(`${spec.elements[current]?.type ?? current}${slot ? ` [${slot}]` : ""}`);
    const p = parent.get(current);
    slot = p?.slot ?? null;
    current = p?.key;
  }
  return steps.join(" › ");
}
