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
    <section id="safety" className="scroll-mt-16 space-y-6 border-t border-line pt-8">
      <h2 className="text-lg font-medium tracking-tight text-fg">Safety rails</h2>
      <ol className="grid gap-x-8 gap-y-6 md:grid-cols-2">
        {RAILS.map((r, i) => (
          <li key={r.title}>
            <p className="text-sm font-medium text-fg">
              <span className="mr-2 font-mono text-xs text-muted">{i + 1}</span>
              {r.title}
            </p>
            <code className="mt-0.5 block font-mono text-xs text-muted">{r.where}</code>
            <p className="mt-2 text-sm text-fg">{r.text}</p>
          </li>
        ))}
      </ol>
      <p className="text-sm text-muted">Deleting is guarded too: a component another one uses (ProductCard inside ProductGrid) can&apos;t be removed.</p>
    </section>
  );
}
