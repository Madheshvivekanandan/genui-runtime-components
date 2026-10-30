/**
 * SHARED · lib/samples.ts — sample content for previews on /components.
 *
 * A composite can be previewed before the AI ever uses it: we fill each slot
 * with made-up storefront data (headphones, prices, reviews). The AI never
 * sees this file; it writes its own content at chat time.
 *
 * Rule for lib/: no secrets, no React, no AI calls.
 */
import type { Spec } from "@json-render/core";
import { isCollection, type CompositeDef } from "./composites";

const pick = <T>(list: T[], i: number) => list[i % list.length];

const PRODUCTS = ["Sony WH-1000XM6", "Bose QuietComfort Ultra", "Sennheiser Momentum 4"];
const BRANDS = ["Sony", "Bose", "Sennheiser"];
const PRICES = [
  { price: "$349", was: "$399" },
  { price: "$299", was: null },
  { price: "$279", was: "$349" },
];
const TAGS = [
  { label: "Battery", value: "30 h" },
  { label: "Weight", value: "250 g" },
  { label: "ANC", value: "Adaptive" },
  { label: "Colour", value: "Black" },
  { label: "Warranty", value: "2 years" },
];
const BADGES = [
  { text: "Best seller", tone: "accent" },
  { text: "In stock", tone: "success" },
  { text: "Low stock", tone: "warning" },
];
const METERS = [
  { label: "5 stars", percent: 78 },
  { label: "4 stars", percent: 14 },
  { label: "3 stars", percent: 5 },
  { label: "2 stars", percent: 2 },
  { label: "1 star", percent: 1 },
];
const ITEMS = [
  { label: "Sony WH-1000XM6", detail: "Black · Qty 1", value: "$349.00", strong: false },
  { label: "USB-C charging cable", detail: "Qty 2", value: "$18.00", strong: false },
];
const TOTALS = [
  { label: "Total", detail: "incl. $29.40 tax", value: "$367.00", strong: true },
  { label: "Shipping", detail: null, value: "Free", strong: false },
];

/**
 * Sample props for an atom. i = position in a repeating slot (or of the parent
 * card), short = a one-line label, slot = the slot it fills (a "totals" slot
 * gets total rows instead of products).
 */
export function sampleProps(type: string, i = 0, short = true, slot = ""): Record<string, unknown> {
  switch (type) {
    case "Eyebrow":
      return { text: short ? pick(BRANDS, i) : `Headphones · ${pick(BRANDS, i)}` };
    case "Headline":
      return { text: pick(PRODUCTS, i) };
    case "Body":
      return { text: "Class-leading noise cancelling, 30-hour battery and a lighter, foldable design." };
    case "Caption":
      return { text: "Free delivery by Thursday · 30-day returns" };
    case "Tag":
      return pick(TAGS, i);
    case "ProductImage":
      return { emoji: "🎧", alt: `${pick(PRODUCTS, i)} headphones` };
    case "Price":
      return pick(PRICES, i);
    case "Rating":
      return { stars: pick([4.7, 4.5, 4.3], i), count: pick([2184, 1290, 856], i) };
    case "Badge":
      return pick(BADGES, i);
    case "Meter":
      return pick(METERS, i);
    case "LineItem":
      return pick(/total/i.test(slot) ? TOTALS : ITEMS, i);
    case "Button":
      return i === 0 ? { label: "Add to cart", variant: "primary" } : { label: "Save for later", variant: "secondary" };
    default:
      return { text: type };
  }
}

/**
 * Builds sample content for a composite: one of each allowed atom per slot,
 * up to 5 items in repeating slots (3 cards in a grid). Returns the elements
 * and the key of the composite.
 */
export function sampleElements(
  def: CompositeDef,
  all: CompositeDef[],
  prefix = def.type.toLowerCase(),
  depth = 0,
  seed = 0, // position in the parent's repeating slot, so products[1] gets the 2nd sample product
): { key: string; elements: Spec["elements"] } {
  const elements: Spec["elements"] = {};
  const slots: Record<string, string[]> = {};
  for (const [slot, rule] of Object.entries(def.slots)) {
    const repeat = Math.min(rule.max, rule.style === "grid" ? 3 : 5);
    const types = isCollection(rule)
      ? Array.from({ length: repeat }, () => rule.allow[0])
      : rule.allow.slice(0, Math.max(rule.min, Math.min(rule.max, rule.allow.length)));
    slots[slot] = types.flatMap((type, i) => {
      const key = `${prefix}-${slot}-${i}`;
      const nested = all.find((c) => c.type === type);
      if (nested) {
        if (depth >= 2) return [];
        const sample = sampleElements(nested, all, key, depth + 1, i);
        Object.assign(elements, sample.elements);
        return [sample.key];
      }
      const short = isCollection(rule) || rule.style === "tab" || depth > 0;
      elements[key] = { type, props: sampleProps(type, isCollection(rule) ? i : seed, short, slot), children: [] };
      return [key];
    });
  }
  const key = prefix;
  elements[key] = { type: def.type, props: { layout: Object.keys(def.layouts)[0] }, children: [], slots };
  return { key, elements };
}

/** A whole sample screen: every composite that fills a screen slot (or just `only`). */
export function sampleScreen(composites: CompositeDef[], only?: CompositeDef): Spec {
  const elements: Spec["elements"] = {};
  const children = (only ? [only] : composites.filter((c) => c.screenSlot)).map((def) => {
    const sample = sampleElements(def, composites);
    Object.assign(elements, sample.elements);
    return sample.key;
  });
  elements.screen = { type: "Page", props: { title: "", accent: "blue", mode: "light" }, children }; // no title: the page around it has one
  return { root: "screen", elements };
}
