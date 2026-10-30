/**
 * FRONTEND · components/Canvas.tsx — the right-hand panel that shows the page.
 *
 * Shows one version of the page (default: the latest, live while streaming):
 *   - Preview tab : <Renderer> turns the spec into real components
 *   - Split tab   : the page and its JSON side by side, linked on hover (Inspector.tsx)
 *   - JSON tab    : the raw spec the AI produced (great for demos)
 *   - Show        : Design (plain) · Slot labels (which slot/field each atom
 *                   fills) · Outlines (every atom, component and frame-drawn
 *                   part, Highlighter.tsx)
 *   - Valid       : validation result from lib/validate.ts (hover for the problems)
 */
import { autoFixSpec, type Spec } from "@json-render/core";
import { JSONUIProvider, Renderer } from "@json-render/react";
import { useMemo, useState } from "react";
import { useComposites, useRegistry } from "@/components/compositeStore";
import { ALL, HighlightBox, HighlightLegend } from "@/components/Highlighter";
import { SplitView } from "@/components/Inspector";
import { buildRegistry } from "@/components/registry";
import { SlotLabels } from "@/components/screen";
import { useColorScheme } from "@/components/useColorScheme";
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
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("preview");
  const composites = useComposites();
  const [show, setShow] = useState<(typeof SHOW)[number]["id"]>("design");
  const version = versions[selectedIndex];
  const labels = show === "labels";

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-subtle">
      {version && (
      <header className="flex h-11 shrink-0 flex-wrap items-center gap-5 border-b border-line bg-page px-5 text-sm">
        {/* View modes on the left, overlays and status on the right. */}
        <Toggle options={TABS} value={tab} onChange={setTab} />
        <div className="ml-auto flex items-center gap-5">
          <Toggle options={SHOW} value={show} onChange={setShow} />
          {versions.length > 1 && <Toggle options={versions.map((_, i) => ({ id: i, label: `v${i + 1}` }))} value={selectedIndex} onChange={onSelect} mono />}
          {version && !streaming && <ValidationBadge spec={version.spec} />}
          {streaming && <span className="animate-pulse text-muted">Building…</span>}
        </div>
      </header>
      )}
      {version && show === "components" && (
        <div className="border-b border-line bg-page px-5 py-2">
          <HighlightLegend />
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        {!version ? (
          <p className="flex h-full items-center justify-center text-sm text-muted">The assistant&apos;s answer appears here.</p>
        ) : tab === "json" ? (
          <pre className="p-5 font-mono text-xs leading-relaxed text-fg">{JSON.stringify(version.spec, null, 2)}</pre>
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

const TABS = [
  { id: "preview", label: "Preview", title: "The page as shoppers see it" },
  { id: "split", label: "Split", title: "The page next to its JSON: hover one to find the other" },
  { id: "json", label: "JSON", title: "The raw spec the AI wrote" },
] as const;

const SHOW = [
  { id: "design", label: "Design", title: "Just the page" },
  { id: "labels", label: "Slot labels", title: "Which slot and data field each atom fills" },
  { id: "components", label: "Outlines", title: "Outline every piece: atoms (code), components (data), and what each component draws itself" },
] as const;

/** A row of text options; the chosen one is darker. */
function Toggle<T extends string | number>({ options, value, onChange, mono = false }: {
  options: readonly { id: T; label: string; title?: string }[];
  value: T;
  onChange: (id: T) => void;
  mono?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 ${mono ? "font-mono text-xs" : ""}`}>
      {options.map((o) => (
        <button
          key={o.id}
          title={o.title}
          aria-pressed={o.id === value}
          onClick={() => onChange(o.id)}
          className={`min-h-8 ${o.id === value ? "text-fg underline decoration-1 underline-offset-[6px]" : "text-muted transition hover:text-fg"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

type PreviewProps = {
  spec: Spec;
  streaming: boolean;
  labels?: boolean;
  composites?: CompositeDef[]; // draw with these instead of the stored ones (an unsaved draft)
  followScheme?: boolean; // sample previews: use the system's light/dark mode instead of the spec's
};

export function Preview({ spec, streaming, labels = false, composites, followScheme = false }: PreviewProps) {
  const scheme = useColorScheme();
  const stored = useRegistry(); // code components + the composites from the database
  const draft = useMemo(() => composites && buildRegistry(composites), [composites]);
  const registry = draft ?? stored;
  if (!registry) return <p className="p-10 text-center text-sm text-muted">Loading components…</p>;
  // autoFixSpec repairs small, safe mistakes (e.g. "visible" put inside props).
  let fixed = autoFixSpec(spec).spec;
  const root = fixed.elements[fixed.root];
  if (followScheme && root?.type === "Page") {
    fixed = { ...fixed, elements: { ...fixed.elements, [fixed.root]: { ...root, props: { ...root.props, mode: scheme } } } };
  }
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
  const ok = problems.length === 0;
  return (
    <span title={ok ? "Passed every check in lib/validate.ts" : problems.join("\n")} className={`cursor-help ${ok ? "text-muted" : "text-fg"}`}>
      {ok ? "Valid" : `${problems.length} issue${problems.length > 1 ? "s" : ""}`}
    </span>
  );
}
