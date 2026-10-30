/**
 * FRONTEND · components/screen — the storefront design: atoms + one composite frame.
 *
 *   context.tsx        : slot labels and which frame an atom sits in
 *   textAtoms.tsx      : Eyebrow, Headline, Body, Caption, Tag
 *   shopAtoms.tsx      : ProductImage, Price, Rating, Badge, Meter, LineItem, Button
 *   CompositeFrame.tsx : draws ANY composite from its JSON definition
 *   SlotRegion.tsx     : how one slot arranges its items (stack, row, grid…)
 *
 * Atoms are React code, registered in components/registry.tsx.
 */
export { SlotLabels } from "./context";
export { Body, Caption, Eyebrow, Headline, Tag } from "./textAtoms";
export { Badge, Button, LineItem, Meter, Price, ProductImage, Rating } from "./shopAtoms";
export { CompositeFrame } from "./CompositeFrame";
