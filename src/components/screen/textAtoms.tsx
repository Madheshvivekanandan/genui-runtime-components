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
    <div className="flex flex-wrap items-center gap-2 text-[length:var(--eyebrow-size,12px)] font-semibold tracking-[0.12em] text-[var(--eyebrow,var(--muted))] uppercase">
      <FieldLabel text={label} />
      <span>{text}</span>
    </div>
  );
}

// A Headline is big on a panel, smaller inside a nested card or an accordion.
const HEADLINE_SIZE = {
  panel: "text-[clamp(18px,2.2cqw,26px)] leading-snug font-semibold",
  accordion: "text-[clamp(16px,1.8cqw,21px)] leading-snug font-semibold",
  plain: "text-[clamp(20px,2.6cqw,30px)] leading-tight font-semibold",
  page: "text-[clamp(20px,2.6cqw,30px)] leading-tight font-semibold",
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
    <p className="text-[15px] leading-relaxed text-[var(--text)] opacity-90">
      <FieldLabel text={label} className="mr-2" />
      {text}
    </p>
  );
}

export function Caption({ text }: { text: string }) {
  const label = useFieldLabel("caption");
  return (
    <p className="text-[13px] leading-snug text-[var(--muted)]">
      <FieldLabel text={label} className="mr-2" />
      {text}
    </p>
  );
}

/** A spec chip: "Battery · 30 h". */
export function Tag({ label, value }: { label: string | null; value: string }) {
  const fieldLabel = useFieldLabel("tag");
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 text-[13px]">
      <FieldLabel text={fieldLabel} />
      {label && <span className="text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">{label}</span>}
      <span className="text-[var(--text)]">{value}</span>
    </span>
  );
}
