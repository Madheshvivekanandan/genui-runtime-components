/**
 * FRONTEND · components/runtime/RuntimeFlow.tsx — the "Runtime components" page (URL /runtime-components).
 *
 * The blog's explainer: how a component added on /components at 10:00 is on
 * the AI's menu at 10:01, without a redeploy. Same layout as /how-it-works:
 * title and the story · step list on the left · the steps · what needs a deploy · safety rails.
 */
"use client";

import { useComposites } from "@/components/compositeStore";
import { StepCard, StepNav } from "@/components/explainer/blocks";
import { TopBar } from "@/components/TopBar";
import { useTraces } from "@/components/traceStore";
import { DeployMatrix } from "./DeployMatrix";
import { flowData } from "./flowData";
import { runtimeSteps } from "./runtimeSteps";
import { SafetyRails } from "./SafetyRails";
import { StoryStrip } from "./StoryStrip";
import { useHistory } from "./useHistory";

export function RuntimeFlow() {
  const composites = useComposites();
  const traces = useTraces();
  const history = useHistory(composites);

  const data = composites && flowData(composites, traces, history);
  const steps = data ? runtimeSteps(data) : [];

  return (
    <div className="min-h-dvh bg-page text-fg">
      <TopBar current="/runtime-components" />
      {!data ? (
        <p className="p-10 text-center text-sm text-muted">Loading components…</p>
      ) : (
        <div className="mx-auto max-w-6xl px-6 py-14">
          <header className="max-w-2xl space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight">Why change UI components at runtime?</h1>
            <p className="text-muted">Because the people who know what the store needs today are not the people who deploy it.</p>
          </header>
          <div className="mt-10">
            <StoryStrip />
          </div>

          <div className="mt-16 grid gap-12 lg:grid-cols-[16rem_minmax(0,1fr)]">
            <aside className="hidden lg:block">
              <StepNav
                steps={steps}
                extra={[
                  { id: "deploy", label: "What needs a deploy?" },
                  { id: "safety", label: "Safety rails" },
                ]}
              />
            </aside>
            <main className="min-w-0 space-y-12">
              {steps.map((st, i) => (
                <StepCard key={i} n={i + 1} step={st} />
              ))}
              <DeployMatrix />
              <SafetyRails />
            </main>
          </div>
        </div>
      )}
    </div>
  );
}
