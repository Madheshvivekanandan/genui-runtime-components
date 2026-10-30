/**
 * FRONTEND · components/screen/shopAtoms.tsx — the storefront atoms.
 *
 * ProductImage, Price, Rating, Badge, Meter, LineItem and Button. These are
 * the only storefront pieces written in React. Every card (ProductCard,
 * CartSummary, the FlashDealCard you add at runtime…) is a composite made of
 * them, stored as data, so it needs no new code.
 */
"use client";

import type { BADGE_TONES } from "@/lib/catalog";
import { FieldLabel, useFieldLabel } from "./context";

/** No real photos in a demo: an emoji on a soft accent tile stands in for the product shot. */
export function ProductImage({ emoji, alt }: { emoji: string; alt: string }) {
  const label = useFieldLabel("image");
  return (
    <div
      role="img"
      aria-label={alt}
      className="relative flex aspect-[16/9] max-h-56 w-full items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[clamp(40px,7cqw,72px)]"
    >
      <span aria-hidden>{emoji}</span>
      {label && <FieldLabel text={label} className="absolute top-2 left-2" />}
    </div>
  );
}

const amount = (text: string) => Number(text.replace(/[^0-9.]/g, ""));

/** The price, the old price struck through, and the discount worked out from both. */
export function Price({ price, was }: { price: string; was: string | null }) {
  const label = useFieldLabel("price");
  const off = was && amount(was) > amount(price) ? Math.round((1 - amount(price) / amount(was)) * 100) : 0;
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <FieldLabel text={label} />
      <span className="text-[clamp(20px,2.4cqw,28px)] font-bold text-[var(--text)]">{price}</span>
      {was && <span className="text-sm text-[var(--muted)] line-through">{was}</span>}
      {off > 0 && <span className="rounded-md bg-[#dc2626] px-1.5 py-0.5 text-xs font-bold text-white">−{off}%</span>}
    </div>
  );
}

export function Rating({ stars, count }: { stars: number; count: number | null }) {
  const label = useFieldLabel("rating");
  const filled = Math.max(0, Math.min(5, stars)) * 20; // % of the five stars to colour
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <FieldLabel text={label} />
      <span aria-label={`${stars} out of 5 stars`} className="relative inline-block tracking-[0.1em] text-[var(--border)]">
        ★★★★★
        <span className="absolute inset-0 overflow-hidden text-[#f59e0b]" style={{ width: `${filled}%` }} aria-hidden>
          ★★★★★
        </span>
      </span>
      <span className="font-semibold text-[var(--text)]">{stars.toFixed(1)}</span>
      {count !== null && <span className="text-[var(--muted)]">({count.toLocaleString("en-US")} reviews)</span>}
    </div>
  );
}

const TONE: Record<(typeof BADGE_TONES)[number], string> = {
  accent: "var(--accent)",
  success: "#059669",
  warning: "#d97706",
  danger: "#dc2626",
  neutral: "var(--muted)",
};

export function Badge({ text, tone }: { text: string; tone: (typeof BADGE_TONES)[number] }) {
  const label = useFieldLabel("badge");
  const color = TONE[tone] ?? TONE.neutral;
  return (
    <span className="inline-flex w-fit items-center gap-1.5">
      <FieldLabel text={label} />
      <span
        style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}
        className="rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase"
      >
        {text}
      </span>
    </span>
  );
}

/** A labelled bar: "5 stars · 78%", "72% claimed". */
export function Meter({ label, percent }: { label: string; percent: number }) {
  const fieldLabel = useFieldLabel("meter");
  const width = Math.max(0, Math.min(100, percent));
  return (
    <div className="space-y-1 text-[13px]">
      <div className="flex items-center justify-between gap-2 text-[var(--muted)]">
        <span className="flex items-center gap-2">
          <FieldLabel text={fieldLabel} />
          {label}
        </span>
        <span className="font-semibold text-[var(--text)]">{width}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--border)]">
        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

/** One row of a cart or receipt: label (+ detail) on the left, value on the right. */
export function LineItem({ label, detail, value, strong }: { label: string; detail: string | null; value: string; strong: boolean }) {
  const fieldLabel = useFieldLabel("line");
  return (
    <div className={`flex items-start justify-between gap-4 ${strong ? "text-base font-bold" : "text-sm"}`}>
      <div className="min-w-0">
        <p className="text-[var(--text)]">
          <FieldLabel text={fieldLabel} className="mr-2" />
          {label}
        </p>
        {detail && <p className="text-xs font-normal text-[var(--muted)]">{detail}</p>}
      </div>
      <span className="shrink-0 text-[var(--text)]">{value}</span>
    </div>
  );
}

/** Looks like a button; the demo has no checkout, so it does nothing. */
export function Button({ label, variant }: { label: string; variant: "primary" | "secondary" }) {
  const fieldLabel = useFieldLabel("button");
  const style =
    variant === "primary" ? "bg-[var(--accent)] text-white hover:opacity-90" : "border border-[var(--border)] text-[var(--text)] hover:bg-[var(--accent-soft)]";
  return (
    <span className="inline-flex items-center gap-2">
      <FieldLabel text={fieldLabel} />
      <button type="button" className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${style}`}>
        {label}
      </button>
    </span>
  );
}
