/**
 * FRONTEND · components/runtime/DeployMatrix.tsx — what is data (no deploy) and what is code (deploy).
 *
 * The honest limit of runtime components: you can only combine pieces that
 * already exist in React. New pieces still ship the normal way.
 */
const DATA = [
  "A new card: FlashDealCard, GiftGuide, BackInStock…",
  "Its slots: which atoms, how many (min / max)",
  "Its approved layouts (slot order, dividers)",
  "Its description: when the AI should use it",
  "Deleting it when the campaign is over",
];
const CODE = [
  "A new atom, e.g. a live Countdown timer (components/screen/shopAtoms.tsx)",
  "A new prop on an atom (its Zod shape in lib/catalog.ts)",
  "A new frame or slot style (CompositeFrame, SlotRegion)",
  "Page-level things: modes, accents, the chat itself",
];

export function DeployMatrix() {
  return (
    <section id="deploy" className="scroll-mt-16 space-y-6 border-t border-line pt-8">
      <h2 className="text-lg font-medium tracking-tight text-fg">What needs a deploy?</h2>
      <div className="grid gap-8 md:grid-cols-2">
        <Column title="Data · no deploy" note="Rows in the database, edited on Components" items={DATA} />
        <Column title="Code · deploy" note="React and Zod, reviewed and shipped as usual" items={CODE} />
      </div>
      <p className="text-sm text-muted">
        Rule of thumb: atoms are your design system&apos;s vocabulary (code). Composites are sentences built from it (data). The AI writes the content.
      </p>
    </section>
  );
}

function Column({ title, note, items }: { title: string; note: string; items: string[] }) {
  return (
    <div>
      <p className="text-sm font-medium text-fg">{title}</p>
      <p className="mb-3 text-xs text-muted">{note}</p>
      <ul className="divide-y divide-line border-y border-line text-sm text-fg">
        {items.map((item) => (
          <li key={item} className="py-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
