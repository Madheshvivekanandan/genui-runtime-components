/**
 * evals/cases.ts — the test prompts and what "correct" means for each.
 *
 * Every case: one or more user turns (2 turns = an edit test), then checks
 * written as code. Grouped by goal (1 = composition, 2 = following instructions).
 * Add your own cases here — that's how you measure a new model or prompt.
 */
import type { Page } from "./inspect";

export type Check = { label: string; test: (page: Page, before: Page) => boolean };
export type Case = { goal: 1 | 2; name: string; turns: string[]; checks: Check[] };

export const CASES: Case[] = [
  /* ---------- Goal 1: components built from smaller components ---------- */
  {
    goal: 1,
    name: "Product results",
    turns: ["Show me 3 noise-cancelling headphones under $350, with price, rating and key specs"],
    checks: [
      {
        label: "ProductGrid with 3 ProductCards in its products slot",
        test: (p) => p.ofType("ProductGrid").some((g) => p.slotOf(g, "products").filter((c) => c.type === "ProductCard").length === 3),
      },
      { label: "every ProductCard has a Price", test: (p) => p.ofType("ProductCard").every((c) => p.slotOf(c, "price").length === 1) },
    ],
  },
  {
    goal: 1,
    name: "Cart",
    turns: ["Show my cart: Sony WH-1000XM6 $349 and a USB-C cable $9 x2, with shipping and total"],
    checks: [
      { label: "CartSummary with 2 items", test: (p) => p.ofType("CartSummary").some((c) => p.slotOf(c, "items").length === 2) },
      { label: "a strong total line", test: (p) => p.ofType("LineItem").some((l) => p.props(l).strong === true) },
    ],
  },

  /* ---------- Goal 2: following instructions ---------- */
  {
    goal: 2,
    name: "Edit: layout only",
    turns: ["Show me 2 running shoes under $150 side by side", "Show the price first"],
    checks: [
      { label: "every ProductCard is price-first", test: (p) => p.ofType("ProductCard").every((c) => p.props(c).layout === "price-first") },
      {
        label: "prices unchanged",
        test: (p, b) => JSON.stringify(p.ofType("Price").map((s) => s.props)) === JSON.stringify(b.ofType("Price").map((s) => s.props)),
      },
    ],
  },
  {
    goal: 2,
    name: "Unsupported request",
    turns: ["Add a video player and a map of our stores"],
    checks: [{ label: "still a non-empty page", test: (p) => p.all.length > 1 }],
  },

  /* ---------- Runtime components (needs FlashDealCard saved on /components) ---------- */
  {
    goal: 1,
    name: "Flash deal (runtime component)",
    turns: ["Any flash deals on headphones today?"],
    checks: [{ label: "uses the FlashDealCard added at runtime", test: (p) => p.count("FlashDealCard") >= 1 }],
  },
];
