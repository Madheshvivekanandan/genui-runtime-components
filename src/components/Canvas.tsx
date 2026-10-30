/**
 * FRONTEND · components/Canvas.tsx — the right-hand panel that shows the page.
 *
 * Shows one version of the page (default: the latest, live while streaming):
 *   - Preview tab : <Renderer> turns the spec into real components
 *   - Split tab   : the page and its JSON side by side, linked on hover (Inspector.tsx)
 *   - JSON tab    : the raw spec the AI produced (great for demos)
 *   - Show        : Design (plain) · Slot labels (the design spec's blue chips:
 *                   which slot/field each atom fills) · Components (outline every
 *                   atom, component and frame-drawn part, Highlighter.tsx)
 *   - badge       : validation result from lib/validate.ts
 */
import { autoFixSpec, type Spec } from "@json-render/core";
import { JSONUIProvider, Renderer } from "@json-render/react";
import { useMemo, useState } from "react";
import { useComposites, useRegistry } from "@/components/compositeStore";
import { ALL, HighlightBox, HighlightLegend } from "@/components/Highlighter";
import { SplitView } from "@/components/Inspector";
import { buildRegistry } from "@/components/registry";
import { SlotLabels } from "@/components/screen";
import type { CompositeDef } from "@/lib/composites";
import type { Version } from "@/lib/spec";
import { findProblems } from "@/lib/validate";

type Props = {
  versions: Version[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  streaming: boolean;
};

export function Canvas({ versions, selectedIndex, onSelect, streaming }: Props) {
  const [tab, setTab] = useState<"preview" | "split" | "json">("split");
  const composites = useComposites();
  const [show, setShow] = useState<"design" | "labels" | "components">("labels");
  const version = versions[selectedIndex];
  const labels = show === "labels";

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-gray-100 dark:bg-gray-900">
      <header className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-800 dark:bg-gray-950">
        {(["preview", "split", "json"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1 ${tab === t ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "text-gray-500"}`}
          >
            {{ preview: "Preview", split: "Split", json: "JSON" }[t]}
          </button>
        ))}
        <div className="ml-3 flex items-center gap-1 text-gray-500">
          <span className="mr-1">Show</span>
          {SHOW.map((o) => (
            <button
              key={o.id}
              onClick={() => setShow(o.id)}
              title={o.title}
              className={`rounded-md px-2 py-1 text-xs ${show === o.id ? "bg-indigo-600 text-white" : "hover:bg-gray-200 dark:hover:bg-gray-800"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          {versions.map((_, i) => (
            <button
              key={i}
              onClick={() => onSelect(i)}
              className={`rounded-md px-2 py-1 font-mono text-xs ${i === selectedIndex ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800"}`}
            >
              v{i + 1}
            </button>
          ))}
        </div>
        {version && !streaming && <ValidationBadge spec={version.spec} />}
        {streaming && <span className="animate-pulse text-blue-600">building…</span>}
        {show === "components" && (
          <div className="basis-full">
            <HighlightLegend />
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        {!version ? (
          <p className="p-10 text-center text-gray-400">The page the agent builds will appear here.</p>
        ) : tab === "json" ? (
          <pre className="p-4 text-xs leading-relaxed">{JSON.stringify(version.spec, null, 2)}</pre>
        ) : tab === "split" ? (
          <SplitView spec={version.spec} composites={composites ?? []} highlightAll={show === "components"}>
            <Preview spec={version.spec} streaming={streaming} labels={labels} />
          </SplitView>
        ) : (
          <HighlightBox spec={version.spec} composites={composites ?? []} scope={show === "components" ? ALL : null}>
            <Preview spec={version.spec} streaming={streaming} labels={labels} />
          </HighlightBox>
        )}
      </div>
    </section>
  );
}

const SHOW = [
  { id: "design", label: "Design", title: "The page as its users see it" },
  { id: "labels", label: "Slot labels", title: "The blue chips from the design spec: which slot and data field each atom fills. Display only." },
  { id: "components", label: "Components", title: "Outline every piece: atoms (code), components (data), and what each component draws itself" },
] as const;

type PreviewProps = {
  spec: Spec;
  streaming: boolean;
  labels?: boolean;
  composites?: CompositeDef[]; // draw with these instead of the stored ones (an unsaved draft)
};

export function Preview({ spec, streaming, labels = false, composites }: PreviewProps) {
  const stored = useRegistry(); // code components + the composites from the database
  const draft = useMemo(() => composites && buildRegistry(composites), [composites]);
  const registry = draft ?? stored;
  if (!registry) return <p className="p-10 text-center text-gray-400">Loading components…</p>;
  // autoFixSpec repairs small, safe mistakes (e.g. "visible" put inside props).
  const fixed = autoFixSpec(spec).spec;
  return (
    // initialState: if the LLM ever uses {"$state": "/path"}, the data lives in spec.state.
    <SlotLabels value={labels}>
      <JSONUIProvider registry={registry} initialState={fixed.state}>
        <Renderer spec={fixed} registry={registry} loading={streaming} />
      </JSONUIProvider>
    </SlotLabels>
  );
}

function ValidationBadge({ spec }: { spec: Spec }) {
  const composites = useComposites();
  if (!composites) return null;
  const problems = findProblems(spec, composites);
  if (problems.length === 0) return <span className="rounded-md bg-emerald-100 px-2 py-1 text-emerald-700">✓ valid</span>;
  return (
    <span title={problems.join("\n")} className="cursor-help rounded-md bg-amber-100 px-2 py-1 text-amber-700">
      ⚠ {problems.length} issue{problems.length > 1 ? "s" : ""}
    </span>
  );
}
