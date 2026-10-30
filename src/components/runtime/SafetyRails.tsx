/**
 * FRONTEND · components/runtime/SafetyRails.tsx — why letting non-engineers add components is safe.
 *
 * Four layers, from "can this be saved?" to "is what the AI built correct?".
 */
const RAILS = [
  {
    title: "Zod schema",
    where: "lib/composites.ts · compositeSchema",
    text: "Shape of a definition: PascalCase type, a real description, known frames and slot styles, at most 8 items per slot.",
  },
  {
    title: "Definition check",
    where: "lib/composites.ts · checkDefinition()",
    text: "Only existing atoms or composites, no self-nesting, every slot placed exactly once per layout. Runs in the form and again in the API.",
  },
  {
    title: "Approved layouts only",
    where: "lib/catalog.ts · buildCatalog()",
    text: "The layout prop is a z.enum of the names you approved. The AI picks one; it can't invent a new arrangement.",
  },
  {
    title: "Output validation",
    where: "lib/validate.ts · findProblems()",
    text: "After the AI answers: props match the Zod shapes, each slot holds allowed atoms within min/max. The canvas badge shows the result.",
  },
];

export function SafetyRails() {
  return (
    <section id="safety" className="scroll-mt-6 space-y-4">
      <h2 className="text-xl font-semibold text-white">Safety rails</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {RAILS.map((r, i) => (
          <div key={r.title} className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
            <p className="flex items-center gap-2 font-semibold text-white">
              <span className="flex size-6 items-center justify-center rounded-md bg-violet-500 text-xs font-bold text-slate-950">{i + 1}</span>
              {r.title}
            </p>
            <code className="mt-1 block text-xs text-slate-500">{r.where}</code>
            <p className="mt-2 text-sm text-slate-300">{r.text}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-slate-400">Deleting is guarded too: a component another one uses (ProductCard inside ProductGrid) can&apos;t be removed.</p>
    </section>
  );
}
