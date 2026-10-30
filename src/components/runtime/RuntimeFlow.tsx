/**
 * FRONTEND · components/runtime/RuntimeFlow.tsx — the "Runtime components" page (URL /runtime-components).
 *
 * The blog's explainer: how a component added on /components at 10:00 is on
 * the AI's menu at 10:01, without a redeploy. Same look as /how-it-works:
 * header (the story) · sticky timeline · step cards · what needs a deploy · safety rails.
 */
"use client";

import Link from "next/link";
import { useComposites } from "@/components/compositeStore";
import { LANES, StepCard } from "@/components/explainer/blocks";
import { useTraces } from "@/components/traceStore";
import { DeployMatrix } from "./DeployMatrix";
import { flowData } from "./flowData";
import { runtimeSteps } from "./runtimeSteps";
import { SafetyRails } from "./SafetyRails";
import { StoryStrip } from "./StoryStrip";

export function RuntimeFlow() {
  const composites = useComposites();
  const traces = useTraces();
  if (!composites) return <p className="min-h-dvh bg-slate-950 p-10 text-center text-slate-500">Loading components…</p>;

  const data = flowData(composites, traces);
  const steps = runtimeSteps(data);

  return (
    <div className="min-h-dvh w-full bg-slate-950 font-sans text-slate-300">
      <header className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-950">
        <div className="pointer-events-none absolute -top-32 right-0 size-[32rem] rounded-full bg-violet-600/20 blur-3xl" />
        <div className="relative space-y-8 px-6 py-8 lg:px-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 font-bold text-white">G</span>
              <div>
                <p className="text-sm font-semibold text-white">Runtime components</p>
                <p className="text-xs text-slate-400">Adding UI components without a redeploy</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <Link href="/components" className="rounded-lg px-3 py-1.5 font-medium text-sky-400 hover:bg-sky-500/10">
                Components
              </Link>
              <Link href="/" className="rounded-lg bg-white px-3 py-1.5 font-medium text-slate-900 hover:bg-slate-200">
                ← Back to app
              </Link>
            </div>
          </div>
          <div className="max-w-4xl space-y-3">
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${data.saved ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
              {data.saved ? `${data.def.type} is in the store` : `${data.def.type} not saved yet: add it on /components`}
            </span>
            <p className="text-3xl leading-tight font-semibold text-white lg:text-4xl">Why would anyone change UI components at runtime?</p>
            <p className="text-slate-400">Because the people who know what the store needs today are not the people who deploy it.</p>
          </div>
          <StoryStrip />
        </div>
      </header>

      <div className="grid gap-8 px-6 py-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:px-10">
        <aside className="hidden lg:block">
          <nav className="sticky top-6 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
            <p className="mb-3 text-xs font-semibold tracking-wider text-slate-500 uppercase">From form to screen</p>
            <ol className="space-y-1">
              {steps.map((st, i) => (
                <li key={i}>
                  <a href={`#step-${i + 1}`} className="flex items-center gap-3 rounded-lg px-1.5 py-1.5 text-sm text-slate-400 hover:bg-white/5 hover:text-slate-200">
                    <span className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-slate-950 ${LANES[st.lane].bg}`}>{i + 1}</span>
                    <span className="truncate">{st.title}</span>
                  </a>
                </li>
              ))}
            </ol>
            <div className="mt-2 space-y-1 border-t border-white/10 pt-2 text-sm">
              <a href="#deploy" className="block rounded-lg px-1.5 py-1.5 text-emerald-300 hover:bg-white/5">What needs a deploy?</a>
              <a href="#safety" className="block rounded-lg px-1.5 py-1.5 text-violet-300 hover:bg-white/5">Safety rails</a>
            </div>
          </nav>
        </aside>

        <main className="min-w-0 space-y-5">
          {steps.map((st, i) => (
            <StepCard key={i} n={i + 1} step={st} />
          ))}
          <div className="space-y-10 pt-6">
            <DeployMatrix />
            <SafetyRails />
          </div>
        </main>
      </div>
    </div>
  );
}
