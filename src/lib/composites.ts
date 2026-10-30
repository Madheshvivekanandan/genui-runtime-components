/**
 * SHARED · lib/composites.ts — components made of atoms, defined as DATA.
 *
 * Atoms (Price, Rating, Button, …) are React code in components/screen/.
 * Composites (ProductCard, CartSummary, …) are JSON: the named slots, which
 * atoms each slot may hold, and the approved layouts. They live in the
 * database (server/db.ts, seeded from data/seed-components.json), can be added from /components with
 * no deploy, and are all drawn by one generic frame (CompositeFrame).
 *
 *   Runtime components: a new composite is a new JSON entry, nothing else.
 *   Safety rails: the AI picks one of the approved layouts and fills the
 *   named slots; this schema + checkDefinition() + lib/validate.ts enforce it.
 *
 * Rule for lib/: no secrets, no React, no AI calls.
 */
import type { UIElement } from "@json-render/core";
import { z } from "zod";

export const FRAMES = ["panel", "accordion", "plain"] as const;
// stack = one under another · row = side by side · columns = side by side with dividers
// grid = cards side by side · wrap = chips that wrap · tab = the coloured label on top of an accordion
export const SLOT_STYLES = ["stack", "row", "columns", "grid", "wrap", "tab"] as const;
export const DIVIDER = "divider";

export const compositeSchema = z.object({
  type: z.string().regex(/^[A-Z][A-Za-z0-9]*$/, "type must be PascalCase, e.g. FlashDealCard"),
  name: z.string().trim().min(1, "name is required"),
  description: z.string().trim().min(10, "description tells the AI when to use it (10+ characters)"),
  frame: z.enum(FRAMES),
  screenSlot: z.string().regex(/^[a-z][a-zA-Z0-9]*$/, "screen slot must be camelCase").nullable(),
  slots: z.record(
    z.string().regex(/^[a-z][a-zA-Z0-9]*$/, "slot names must be camelCase"),
    z.object({
      allow: z.array(z.string()).min(1, "each slot must allow at least one component"),
      min: z.number().int().min(0),
      max: z.number().int().min(1).max(8),
      style: z.enum(SLOT_STYLES),
    }),
  ),
  // Each layout is the order of the slots, top to bottom; "divider" draws a line.
  layouts: z.record(z.string().regex(/^[a-z][a-z0-9-]*$/, "layout names must be kebab-case"), z.array(z.string())),
});
export type CompositeDef = z.infer<typeof compositeSchema>;
export type SlotRule = CompositeDef["slots"][string];

/** Slots whose items repeat (products[0], products[1]…) rather than one fixed piece. */
export const isCollection = (rule: SlotRule) => rule.style === "columns" || rule.style === "grid" || rule.style === "wrap";

/** Child keys of an element in a slot. The default slot is the element's "children". */
export const slotKeys = (el: UIElement, slot: string): string[] => el.slots?.[slot] ?? [];

/** The text json-render shows the AI for this composite (the catalog "description"). */
export function describeComposite(def: CompositeDef): string {
  const layouts = Object.entries(def.layouts).map(([name, order]) => `${name} = ${order.join(" → ")}`);
  const slots = Object.entries(def.slots).map(
    ([slot, r]) => `${slot} ${r.min}-${r.max} of ${r.allow.join("/")}${r.style === "tab" ? " (tab label)" : ""}`,
  );
  return `${def.description} layout (pick one): ${layouts.join("; ")}. Slots: ${slots.join("; ")}.`;
}

/**
 * Is this definition safe to save? Shared by the /components form (live) and
 * the API (enforced). `atoms` and `reserved` come from lib/catalog.ts.
 */
export function checkDefinition(
  input: unknown,
  { others, atoms, reserved }: { others: CompositeDef[]; atoms: readonly string[]; reserved: readonly string[] },
): string[] {
  const parsed = compositeSchema.safeParse(input);
  if (!parsed.success) return parsed.error.issues.map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message));
  const def = parsed.data;
  const problems: string[] = [];
  const known = new Set([...atoms, ...others.map((o) => o.type)]);

  if (reserved.includes(def.type)) problems.push(`type: ${def.type} is a built-in component name`);
  const slotNames = Object.keys(def.slots);
  if (slotNames.length === 0) problems.push("add at least one slot");
  for (const [slot, rule] of Object.entries(def.slots)) {
    if (rule.min > rule.max) problems.push(`${slot}: min (${rule.min}) is larger than max (${rule.max})`);
    for (const t of rule.allow) {
      if (t === def.type) problems.push(`${slot}: a component can't contain itself`);
      else if (!known.has(t)) problems.push(`${slot}: unknown component "${t}"`);
    }
    if (rule.style === "tab") {
      if (def.frame !== "accordion") problems.push(`${slot}: tab slots only exist on the accordion frame`);
      if (rule.max !== 1 || rule.allow.some((t) => t !== "Eyebrow")) problems.push(`${slot}: a tab holds exactly one Eyebrow (max 1)`);
    }
  }
  if (slotNames.filter((s) => def.slots[s].style === "tab").length > 1) problems.push("only one tab slot is allowed");

  const placed = slotNames.filter((s) => def.slots[s].style !== "tab"); // the tab sits on the frame, not in the flow
  if (Object.keys(def.layouts).length === 0) problems.push("add at least one layout");
  for (const [name, order] of Object.entries(def.layouts)) {
    for (const entry of order) {
      if (entry !== DIVIDER && !placed.includes(entry)) problems.push(`layout ${name}: "${entry}" is not a slot`);
    }
    for (const slot of placed) {
      const n = order.filter((e) => e === slot).length;
      if (n !== 1) problems.push(`layout ${name}: must place "${slot}" exactly once (found ${n})`);
    }
    if (order[0] === DIVIDER || order.at(-1) === DIVIDER || order.some((e, i) => e === DIVIDER && order[i + 1] === DIVIDER)) {
      problems.push(`layout ${name}: dividers go between slots`);
    }
  }
  return problems;
}
