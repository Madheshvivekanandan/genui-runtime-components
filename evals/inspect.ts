/**
 * evals/inspect.ts — small helpers to ask questions about a built page,
 * e.g. "how many ProductCard elements?" or "is the ProductGrid before the CartSummary?".
 */
import type { Spec, UIElement } from "@json-render/core";
import { childKeys, reachableElements } from "@/lib/spec";

export type Page = ReturnType<typeof inspect>;

export function inspect(spec: Spec | null) {
  const all: UIElement[] = spec ? reachableElements(spec) : []; // in on-screen order
  const childrenOf = (el: UIElement) => childKeys(el).map((k) => spec!.elements[k]).filter(Boolean);
  const slotOf = (el: UIElement | undefined, slot: string) => (el?.slots?.[slot] ?? []).map((k) => spec!.elements[k]).filter(Boolean);
  const descendants = (el: UIElement): UIElement[] => childrenOf(el).flatMap((c) => [c, ...descendants(c)]);

  return {
    spec,
    all,
    root: all[0],
    ofType: (type: string) => all.filter((e) => e.type === type),
    count: (type: string) => all.filter((e) => e.type === type).length,
    props: (el: UIElement | undefined) => (el?.props ?? {}) as Record<string, unknown>,
    childrenOf,
    slotOf,
    descendants,
    /** true if every type appears, in this order, on the page */
    inOrder: (...types: string[]) => {
      const positions = types.map((t) => all.findIndex((e) => e.type === t));
      return positions.every((p, i) => p >= 0 && (i === 0 || p > positions[i - 1]));
    },
  };
}
