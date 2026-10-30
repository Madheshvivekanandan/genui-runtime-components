/**
 * SHARED · lib/catalog.ts — WHAT the AI is allowed to build.
 *
 * The "menu" of components, used on BOTH sides:
 *   - SERVER (server/agent.ts): catalog.prompt() turns this menu into
 *     instructions for the LLM.
 *   - BROWSER (components/registry.tsx): defineRegistry() makes us build a
 *     real React component for every item on the menu.
 *
 * Three groups:
 *   PAGE       — the root: title, colours, and it stacks its children
 *   ATOMS      — the smallest pieces of the storefront design (Price, Rating, …)
 *   COMPOSITES — built from atoms, stored as data (lib/composites.ts), so
 *                the catalog is built per request: buildCatalog(composites).
 *                That is what makes runtime components work: a component
 *                saved at 10:00 is on the menu of the 10:01 request.
 *   (props) — Zod shapes + descriptions keep the AI on the rails
 *
 * Rule for lib/: no secrets, no React, no AI calls.
 */
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";
import { checkDefinition, describeComposite, type CompositeDef } from "./composites";

export const ACCENTS = ["blue", "violet", "emerald", "rose", "amber", "slate"] as const;
export const BADGE_TONES = ["accent", "success", "warning", "danger", "neutral"] as const;

/** Components written in code. Composites from the store are added on top. */
const BASE_COMPONENTS = {
  /* ---------- PAGE ---------- */
  Page: {
    props: z.object({
      title: z.string(),
      accent: z.enum(ACCENTS),
      mode: z.enum(["light", "dark"]),
    }),
    description:
      "ALWAYS the root element. Sets page title, accent colour (emerald = green, rose = red/pink, " +
      "amber = orange/yellow, violet = purple, slate = grey) and mode (light or dark). Children stack vertically.",
  },

  /* ---------- ATOMS: text (components/screen/textAtoms.tsx) ---------- */
  Eyebrow: {
    props: z.object({ text: z.string() }),
    description: "Short uppercase label above a title, e.g. a brand 'Sony' or 'Your cart · 3 items'. Atom, no children.",
  },
  Headline: {
    props: z.object({ text: z.string() }),
    description: "A title: a product name or a one-line heading. Its size comes from the composite it sits in. Atom, no children.",
  },
  Body: {
    props: z.object({ text: z.string() }),
    description: "A sentence or short paragraph, e.g. a product summary or a review quote. Atom, no children.",
  },
  Caption: {
    props: z.object({ text: z.string() }),
    description: "A short muted note, e.g. 'Free delivery by Thursday'. Atom, no children.",
  },
  Tag: {
    props: z.object({ label: z.string().nullable(), value: z.string() }),
    description: "A spec chip with a small label and a value, e.g. label 'Battery' value '30 h'. Atom, no children.",
  },

  /* ---------- ATOMS: storefront (components/screen/shopAtoms.tsx) ---------- */
  ProductImage: {
    props: z.object({ emoji: z.string(), alt: z.string() }),
    description: "Product picture placeholder: ONE emoji that shows the product (🎧, 👟, ⌚) and alt text. Atom, no children.",
  },
  Price: {
    props: z.object({ price: z.string(), was: z.string().nullable() }),
    description: "Price with currency, e.g. '$249'. `was` = the old price when discounted (the % off is computed), else null. Atom, no children.",
  },
  Rating: {
    props: z.object({ stars: z.number().min(0).max(5), count: z.number().int().nullable() }),
    description: "Star rating 0-5 (decimals allowed) and the number of reviews (or null). Atom, no children.",
  },
  Badge: {
    props: z.object({ text: z.string(), tone: z.enum(BADGE_TONES) }),
    description: "A small coloured pill, e.g. 'Best seller' (accent), 'In stock' (success), 'Low stock' (warning), 'Sale' (danger). Atom, no children.",
  },
  Meter: {
    props: z.object({ label: z.string(), percent: z.number().min(0).max(100) }),
    description: "A labelled progress bar, e.g. label '5 stars' percent 78, or '72% claimed'. Atom, no children.",
  },
  LineItem: {
    props: z.object({ label: z.string(), detail: z.string().nullable(), value: z.string(), strong: z.boolean() }),
    description: "One row of a cart or receipt: label (+ optional detail like 'Qty 2') left, value right. strong = true for the total. Atom, no children.",
  },
  Button: {
    props: z.object({ label: z.string(), variant: z.enum(["primary", "secondary"]) }),
    description: "A call to action, e.g. 'Add to cart' (primary) or 'Save for later' (secondary). Atom, no children.",
  },
};

export const ATOM_TYPES = ["Eyebrow", "Headline", "Body", "Caption", "Tag", "ProductImage", "Price", "Rating", "Badge", "Meter", "LineItem", "Button"] as const;

/** Only the code components: gives the React registry its prop types. */
export const baseCatalog = defineCatalog(schema, { components: BASE_COMPONENTS, actions: {} });

/**
 * The full menu for one request: code components + the composites from the
 * store. Each composite gets one prop (which approved layout) and its named slots.
 */
export function buildCatalog(composites: CompositeDef[]) {
  const entries = composites.map((def) => {
    const layouts = Object.keys(def.layouts) as [string, ...string[]];
    return [def.type, { props: z.object({ layout: z.enum(layouts) }), slots: Object.keys(def.slots), description: describeComposite(def) }];
  });
  return defineCatalog(schema, { components: { ...BASE_COMPONENTS, ...Object.fromEntries(entries) }, actions: {} });
}

/** Can this composite be saved? (used by the /components form and the API) */
export function checkComponent(input: unknown, others: CompositeDef[]): string[] {
  return checkDefinition(input, { others, atoms: ATOM_TYPES, reserved: Object.keys(BASE_COMPONENTS) });
}

/** Extra rules appended to json-render's generated prompt. */
export const RULES = [
  "The root element MUST be a Page. Put everything else inside it.",
  "Follow explicit numbers exactly: '3 headphones' means exactly 3 ProductCard elements, '4 specs' means exactly 4 Tag elements.",
  "Keep the order the user asked for (first X, then Y means X appears before Y).",
  "Write literal prop values. Do NOT use $state, $item, $bindState or repeat: write every element explicitly.",
  "There is no product database: invent realistic products, prices, ratings and reviews. Never lorem ipsum.",
  "Pick the component made for the job: read each component's description. A component made for a special purpose (a sale, a campaign) beats a generic one.",
  "When editing an existing page, change ONLY what the user asked for and keep every other element and value identical.",
  "If the user asks for a completely different page, replace /root with a new Page element and build the new page.",
  "If something cannot be built with the available components, use the closest components and say so in one sentence.",
];

/** How to fill a composite's named slots: json-render's prompt lists slot names but never shows the format. */
function compositeRules(composites: CompositeDef[]): string[] {
  const example = composites.find((c) => c.screenSlot) ?? composites[0];
  if (!example) return [];
  const slots = Object.fromEntries(Object.keys(example.slots).map((s) => [s, [`${s}-1`]]));
  const element = { type: example.type, props: { layout: Object.keys(example.layouts)[0] }, children: [], slots };
  return [
    `Composite components (${composites.map((c) => c.type).join(", ")}) take content ONLY through a top-level "slots" field, a sibling of children (NOT inside props), and always have "children": []. Example: ${JSON.stringify(element)}`,
    "Respect each slot's min-max and allowed components. Every key listed in a slot must be output as its own element.",
    "To change how a composite is arranged, replace its layout prop with another of its listed layouts. Never invent a layout.",
  ];
}

/**
 * The full system prompt: json-render writes it from the catalog + our rules.
 * Lives here (shared) so the server sends it AND the How-it-works page can show it.
 */
export function buildInstructions(composites: CompositeDef[]): string {
  return buildCatalog(composites).prompt({
    mode: "inline", // the LLM writes one sentence, then the UI patches
    system: "You are the shopping assistant of an online store. You answer shoppers with UI built from a fixed component library.",
    customRules: [...RULES, ...compositeRules(composites)],
  });
}
