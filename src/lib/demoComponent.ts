/**
 * SHARED · lib/demoComponent.ts — the component the demo adds AT RUNTIME.
 *
 * The story: at 10:00 a merchandiser opens /components to add a card for a
 * 48-hour flash sale. At 10:01 the shopping assistant is already using it.
 * When the sale ends, they delete it. No code change, no deploy.
 *
 * It is deliberately NOT in data/seed-components.json: the /components form starts
 * with it filled in, ready to save, and the /runtime-components page shows it.
 * Every piece it uses (Badge, Price, Meter…) is an atom that already exists.
 */
import type { CompositeDef } from "./composites";

export const FLASH_DEAL_CARD: CompositeDef = {
  type: "FlashDealCard",
  name: "flash_deal",
  description:
    "A time-limited flash deal: sale badges, the product, its discounted price, how much stock is claimed and when the deal ends. " +
    "Use it whenever the shopper asks about deals, sales or discounts.",
  frame: "panel",
  screenSlot: "deal",
  slots: {
    badges: { allow: ["Badge"], min: 1, max: 2, style: "row" },
    media: { allow: ["ProductImage"], min: 0, max: 1, style: "stack" },
    header: { allow: ["Eyebrow", "Headline"], min: 1, max: 2, style: "stack" },
    price: { allow: ["Price"], min: 1, max: 1, style: "stack" },
    claimed: { allow: ["Meter"], min: 0, max: 1, style: "stack" },
    ends: { allow: ["Caption"], min: 0, max: 1, style: "stack" },
    actions: { allow: ["Button"], min: 0, max: 1, style: "row" },
  },
  layouts: {
    "image-top": ["media", "badges", "header", "price", "claimed", "ends", "actions"],
    "urgency-first": ["badges", "ends", "claimed", "divider", "media", "header", "price", "actions"],
  },
};
