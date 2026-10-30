/**
 * FRONTEND · components/explainer/blocks.tsx — building blocks of the explainer pages.
 *
 * Shared by /how-it-works and /runtime-components:
 *   LANES     : where a step runs (browser, server, LLM), with its colours
 *   StepCard  : one numbered step: title, where in the code, summary | data
 *   Data      : a dark code panel with a copy button and JSON colouring
 *   Mono      : inline code
 */
"use client";

import { useState, type ReactNode } from "react";

export type Lane = "browser" | "server" | "llm";
export const LANES: Record<Lane, { label: string; text: string; bg: string; soft: string; ring: string }> = {
  browser: { label: "Browser", text: "text-sky-300", bg: "bg-sky-500", soft: "bg-sky-500/15 text-sky-300", ring: "ring-sky-500/40" },
  server: { label: "Server", text: "text-violet-300", bg: "bg-violet-500", soft: "bg-violet-500/15 text-violet-300", ring: "ring-violet-500/40" },
  llm: { label: "LLM", text: "text-amber-300", bg: "bg-amber-500", soft: "bg-amber-500/15 text-amber-300", ring: "ring-amber-500/40" },
};

export type Step = { lane: Lane; title: string; where: string; summary: ReactNode; data?: ReactNode };

export function StepCard({ n, step }: { n: number; step: Step }) {
  const lane = LANES[step.lane];
  return (
    <section id={`step-${n}`} className="scroll-mt-6 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-white/[0.02] px-5 py-3">
        <span className={`flex size-7 items-center justify-center rounded-lg text-sm font-bold text-slate-950 ${lane.bg}`}>{n}</span>
        <h2 className="text-lg font-semibold text-white">{step.title}</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${lane.soft}`}>{lane.label}</span>
        <code className="ml-auto rounded-md bg-white/5 px-2 py-0.5 text-xs text-slate-400">{step.where}</code>
      </div>
      <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="space-y-3 text-[15px] leading-relaxed">{step.summary}</div>
        <div className="min-w-0">{step.data}</div>
      </div>
    </section>
  );
}

export /** A dark code panel with copy button and light JSON highlighting. */
function Data({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950">
      <div className="flex items-center justify-between border-b border-white/10 bg-slate-900 px-3 py-1.5 text-xs">
        <span className="text-slate-400">{label}</span>
        <button
          onClick={() => navigator.clipboard?.writeText(value).then(() => (setCopied(true), setTimeout(() => setCopied(false), 1200)))}
          className="rounded px-2 py-0.5 text-slate-500 hover:bg-white/10 hover:text-slate-200"
        >
          {copied ? "copied ✓" : "copy"}
        </button>
      </div>
      <pre className="max-h-[26rem] overflow-auto p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-slate-300 [overflow-wrap:anywhere]">
        <Highlight text={value} />
      </pre>
    </div>
  );
}

/** Colours JSON keys, strings, numbers and literals (no HTML injection: plain React spans). */
function Highlight({ text }: { text: string }) {
  const out: ReactNode[] = [];
  const re = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\b\d+(?:\.\d+)?\b)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) out.push(text.slice(last, i));
    const cls = m[1] ? (m[2] ? "text-sky-300" : "text-emerald-300") : m[3] ? "text-violet-300" : "text-amber-300";
    out.push(<span key={i} className={cls}>{m[1] ?? m[0]}</span>);
    if (m[2]) out.push(m[2]);
    last = i + m[0].length;
    if (out.length > 6000) break; // keep huge texts fast
  }
  out.push(text.slice(last));
  return <>{out}</>;
}

export function Mono({ children }: { children: ReactNode }) {
  return <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.85em] text-slate-100">{children}</code>;
}
