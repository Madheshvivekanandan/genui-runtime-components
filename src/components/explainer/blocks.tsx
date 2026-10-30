/**
 * FRONTEND · components/explainer/blocks.tsx — building blocks of the explainer pages.
 *
 * Shared by /how-it-works and /runtime-components:
 *   LANES     : where a step runs (browser, server, LLM)
 *   StepCard  : one numbered step: title, where in the code, summary | data
 *   StepNav   : the sticky list of steps on the left
 *   Data      : a code panel with a copy button and light JSON colouring
 *   Mono      : inline code
 */
"use client";

import { useState, type ReactNode } from "react";

export type Lane = "browser" | "server" | "llm";
export const LANES: Record<Lane, { label: string }> = {
  browser: { label: "Browser" },
  server: { label: "Server" },
  llm: { label: "LLM" },
};

export type Step = { lane: Lane; title: string; where: string; summary: ReactNode; data?: ReactNode };

export function LaneTag({ lane }: { lane: Lane }) {
  return <span className="text-xs text-muted">{LANES[lane].label}</span>;
}

export function StepCard({ n, step }: { n: number; step: Step }) {
  return (
    <section id={`step-${n}`} className="scroll-mt-16 border-t border-line pt-8">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-xs text-muted">{String(n).padStart(2, "0")}</span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-fg">{step.title}</h2>
          <p className="mt-0.5 text-xs text-muted">
            <LaneTag lane={step.lane} /> · <code className="font-mono">{step.where}</code>
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <div className="space-y-3 text-sm leading-relaxed text-fg">{step.summary}</div>
        <div className="min-w-0">{step.data}</div>
      </div>
    </section>
  );
}

/** The step list on the left: plain numbered links, the current one darker. */
export function StepNav({ steps, active, extra }: { steps: Step[]; active?: string; extra?: { id: string; label: string }[] }) {
  const link = (id: string, label: ReactNode) => (
    <a key={id} href={`#${id}`} className={`flex gap-3 py-1 text-sm ${active === id ? "text-fg" : "text-muted hover:text-fg"}`}>
      {label}
    </a>
  );
  return (
    <nav className="sticky top-8 space-y-0.5">
      {steps.map((st, i) =>
        link(
          `step-${i + 1}`,
          <>
            <span className="w-5 shrink-0 font-mono text-xs leading-5">{String(i + 1).padStart(2, "0")}</span>
            <span className="line-clamp-2 leading-snug">{st.title}</span>
          </>,
        ),
      )}
      {extra && <div className="mt-3 border-t border-line pt-3">{extra.map((e) => link(e.id, e.label))}</div>}
    </nav>
  );
}

/** A code panel with a copy button and light JSON colouring. */
export function Data({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-subtle">
      <div className="flex items-center justify-between border-b border-line px-3 py-1.5 text-xs text-muted">
        <span>{label}</span>
        <button
          onClick={() => navigator.clipboard?.writeText(value).then(() => (setCopied(true), setTimeout(() => setCopied(false), 1200)))}
          className="-my-1 min-h-7 px-1 hover:text-fg"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-h-[26rem] overflow-auto p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-fg [overflow-wrap:anywhere]">
        {/^\s*[[{]/.test(value) ? <Highlight text={value} /> : value /* only colour JSON, not prose or tables */}
      </pre>
    </div>
  );
}

/** Colours JSON strings and values; keys stay plain (no HTML injection: plain React spans). */
function Highlight({ text }: { text: string }) {
  const out: ReactNode[] = [];
  const re = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\b\d+(?:\.\d+)?\b)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) out.push(text.slice(last, i));
    const cls = m[1] ? (m[2] ? "text-fg" : "text-muted") : "text-accent"; // one hue: keys plain, strings muted, values accent
    out.push(<span key={i} className={cls}>{m[1] ?? m[0]}</span>);
    if (m[2]) out.push(m[2]);
    last = i + m[0].length;
    if (out.length > 6000) break; // keep huge texts fast
  }
  out.push(text.slice(last));
  return <>{out}</>;
}

export function Mono({ children }: { children: ReactNode }) {
  return <code className="rounded bg-subtle px-1 py-0.5 font-mono text-[0.85em] text-fg">{children}</code>;
}
