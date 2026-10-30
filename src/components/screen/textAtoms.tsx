/**
 * FRONTEND · components/screen/textAtoms.tsx — the plain text atoms.
 *
 * Eyebrow, Headline, Body, Caption and Tag: the words of any card.
 * Colours come from the CSS variables <Page> sets (--text, --muted, --border…),
 * so light and dark mode restyle every atom at once.
 */
"use client";

import { FieldLabel, useFieldLabel, useFrame } from "./context";

export function Eyebrow({ text }: { text: string }) {
  const label = useFieldLabel("eyebrow");
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--muted)]">
      <FieldLabel text={label} />
      <span>{text}</span>
    </div>
  );
}

// A Headline is big on a panel, smaller inside a nested card or an accordion.
const HEADLINE_SIZE = {
  panel: "text-base leading-snug font-medium",
  accordion: "text-base leading-snug font-medium",
  plain: "text-2xl leading-tight font-semibold tracking-tight",
  page: "text-2xl leading-tight font-semibold tracking-tight",
};

export function Headline({ text }: { text: string }) {
  const frame = useFrame();
  const label = useFieldLabel("headline");
  return (
    <p className={`text-[var(--text)] ${HEADLINE_SIZE[frame]}`}>
      <FieldLabel text={label} className="mr-2" />
      {text}
    </p>
  );
}

export function Body({ text }: { text: string }) {
  const label = useFieldLabel("body");
  return (
    <p className="text-sm leading-relaxed text-[var(--text)]">
      <FieldLabel text={label} className="mr-2" />
      {text}
    </p>
  );
}

export function Caption({ text }: { text: string }) {
  const label = useFieldLabel("caption");
  return (
    <p className="text-xs leading-snug text-[var(--muted)]">
      <FieldLabel text={label} className="mr-2" />
      {text}
    </p>
  );
}

/** A spec chip: "Battery · 30 h". */
export function Tag({ label, value }: { label: string | null; value: string }) {
  const fieldLabel = useFieldLabel("tag");
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-md bg-[var(--soft)] px-2 py-1 text-xs">
      <FieldLabel text={fieldLabel} />
      {label && <span className="text-[var(--muted)]">{label}</span>}
      <span className="text-[var(--text)]">{value}</span>
    </span>
  );
}
