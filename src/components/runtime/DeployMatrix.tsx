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
    <section id="deploy" className="scroll-mt-6 space-y-4">
      <h2 className="text-xl font-semibold text-white">What needs a deploy?</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <Column title="Data · no deploy" note="data/components.json, edited on /components" items={DATA} tone="border-emerald-500/40 bg-emerald-500/10" mark="✓" />
        <Column title="Code · deploy" note="React + Zod, reviewed and shipped as usual" items={CODE} tone="border-white/10 bg-white/[0.03]" mark="⌁" />
      </div>
      <p className="text-sm text-slate-400">
        Rule of thumb: atoms are your design system&apos;s vocabulary (code). Composites are sentences built from it (data). The AI writes the content.
      </p>
    </section>
  );
}

function Column({ title, note, items, tone, mark }: { title: string; note: string; items: string[]; tone: string; mark: string }) {
  return (
    <div className={`rounded-2xl border p-5 ${tone}`}>
      <p className="font-semibold text-white">{title}</p>
      <p className="mb-3 text-xs text-slate-400">{note}</p>
      <ul className="space-y-1.5 text-sm text-slate-300">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="text-slate-500">{mark}</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
