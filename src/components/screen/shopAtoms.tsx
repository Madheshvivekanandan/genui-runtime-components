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
      className="relative flex aspect-[4/3] max-h-44 w-full items-center justify-center rounded-lg bg-[var(--soft)] text-5xl"
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
      <span className="text-lg font-semibold text-[var(--text)]">{price}</span>
      {was && <span className="text-sm text-[var(--muted)] line-through">{was}</span>}
      {off > 0 && <span className="text-xs font-medium text-[var(--accent)]">−{off}%</span>}
    </div>
  );
}

export function Rating({ stars, count }: { stars: number; count: number | null }) {
  const label = useFieldLabel("rating");
  const filled = Math.max(0, Math.min(5, stars)) * 20; // % of the five stars to colour
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <FieldLabel text={label} />
      <span aria-label={`${stars} out of 5 stars`} className="relative inline-block text-[var(--border)]">
        ★★★★★
        <span className="absolute inset-0 overflow-hidden text-[var(--text)]" style={{ width: `${filled}%` }} aria-hidden>
          ★★★★★
        </span>
      </span>
      <span className="text-[var(--text)]">{stars.toFixed(1)}</span>
      {count !== null && <span className="text-[var(--muted)]">· {count.toLocaleString("en-US")} reviews</span>}
    </div>
  );
}

const TONE: Record<(typeof BADGE_TONES)[number], string> = {
  accent: "var(--accent)",
  success: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626",
  neutral: "var(--border)",
};

/** A short label with a coloured status dot, e.g. "Best seller" (accent) or "Low stock" (warning). */
export function Badge({ text, tone }: { text: string; tone: (typeof BADGE_TONES)[number] }) {
  const label = useFieldLabel("badge");
  const color = TONE[tone] ?? TONE.neutral;
  return (
    <span className="inline-flex w-fit items-center gap-1.5 text-xs text-[var(--muted)]">
      <FieldLabel text={label} />
      <span aria-hidden className="size-1.5 rounded-full" style={{ background: color }} />
      {text}
    </span>
  );
}

/** A labelled bar: "5 stars · 78%", "72% claimed". */
export function Meter({ label, percent }: { label: string; percent: number }) {
  const fieldLabel = useFieldLabel("meter");
  const width = Math.max(0, Math.min(100, percent));
  return (
    <div className="space-y-1.5 text-xs">
      <div className="flex items-center justify-between gap-2 text-[var(--muted)]">
        <span className="flex items-center gap-2">
          <FieldLabel text={fieldLabel} />
          {label}
        </span>
        <span className="text-[var(--text)]">{width}%</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-[var(--soft)]">
        <div className="h-full rounded-full bg-[var(--text)]" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

/** One row of a cart or receipt: label (+ detail) on the left, value on the right. */
export function LineItem({ label, detail, value, strong }: { label: string; detail: string | null; value: string; strong: boolean }) {
  const fieldLabel = useFieldLabel("line");
  return (
    <div className={`flex items-start justify-between gap-4 text-sm ${strong ? "font-semibold" : ""}`}>
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
    variant === "primary" ? "bg-[var(--text)] text-[var(--bg)] hover:opacity-85" : "border border-[var(--border)] text-[var(--text)] hover:bg-[var(--soft)]";
  return (
    <span className="inline-flex items-center gap-2">
      <FieldLabel text={fieldLabel} />
      <button type="button" className={`rounded-md px-3.5 py-2 text-sm font-medium transition ${style}`}>
        {label}
      </button>
    </span>
  );
}
