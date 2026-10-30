/**
 * SHARED · lib/validate.ts — is the page the AI built actually correct?
 *
 * Three layers of checks:
 *   1. Structure  (json-render validateSpec): root exists, children exist...
 *   2. Props      (catalog.validate, i.e. our Zod schemas): right types/values
 *   3. Our rules  (hand-written): things a schema can't express, including
 *                 each composite's slot rules (which atoms, how many)
 *
 * Used by the canvas (validation badge) and by the test suite.
 */
import { validateSpec, type Spec } from "@json-render/core";
import { buildCatalog } from "./catalog";
import type { CompositeDef } from "./composites";

// Building a catalog isn't free; the composites list only changes when one is saved.
const catalogs = new WeakMap<CompositeDef[], ReturnType<typeof buildCatalog>>();

export function findProblems(spec: Spec, composites: CompositeDef[]): string[] {
  const problems: string[] = [];

  // 1. Structure
  for (const issue of validateSpec(spec).issues) {
    if (issue.severity === "error") problems.push(issue.message);
  }

  // 2. Props, checked against the Zod schemas in catalog.ts (+ each composite's layout list)
  let catalog = catalogs.get(composites);
  if (!catalog) catalogs.set(composites, (catalog = buildCatalog(composites)));
  const props = catalog.validate(spec);
  if (!props.success && props.error) {
    for (const e of props.error.issues.slice(0, 5)) problems.push(`${e.path.join(".")}: ${e.message}`);
  }

  // 3. Our own rules
  if (spec.elements[spec.root]?.type !== "Page") problems.push("Root element must be a Page");
  for (const [key, el] of Object.entries(spec.elements)) {
    const def = composites.find((c) => c.type === el.type);
    if (def) problems.push(...slotProblems(key, el, def, spec));
  }
  return problems;
}

/** A composite's content must respect the slot rules from its definition. */
function slotProblems(key: string, el: Spec["elements"][string], def: CompositeDef, spec: Spec): string[] {
  const problems: string[] = [];
  if (el.children?.length) problems.push(`${key}: ${def.type} takes content only through its slots, not children`);
  for (const slot of Object.keys(el.slots ?? {})) {
    if (!def.slots[slot]) problems.push(`${key}: ${def.type} has no slot "${slot}"`);
  }
  for (const [slot, rule] of Object.entries(def.slots)) {
    const types = (el.slots?.[slot] ?? []).map((k) => spec.elements[k]?.type).filter(Boolean);
    if (types.length < rule.min) problems.push(`${key}: slot "${slot}" needs at least ${rule.min} (has ${types.length})`);
    if (types.length > rule.max) problems.push(`${key}: slot "${slot}" allows at most ${rule.max} (has ${types.length})`);
    for (const t of new Set(types)) {
      if (!rule.allow.includes(t)) problems.push(`${key}: slot "${slot}" can't hold ${t} (allowed: ${rule.allow.join(", ")})`);
    }
  }
  return problems;
}
