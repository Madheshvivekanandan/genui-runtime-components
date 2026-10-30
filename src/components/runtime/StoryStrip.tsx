/**
 * FRONTEND · components/runtime/StoryStrip.tsx — "why would anyone add components at runtime?"
 *
 * The use case in three moments, plus the reason it scales: one app, many stores.
 */
const MOMENTS = [
  { time: "10:00", title: "Sale starts", text: "A merchandiser adds a FlashDealCard on /components. No ticket, no PR." },
  { time: "10:01", title: "Assistant uses it", text: "The next shopper who asks about deals gets the new card." },
  { time: "Sun 23:59", title: "Sale ends", text: "They delete it. The assistant stops using it on the next message." },
];

export function StoryStrip() {
  return (
    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
      {MOMENTS.map((m, i) => (
        <div key={m.time} className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="font-mono text-xs text-sky-300">{m.time}</p>
          <p className="mt-1 font-semibold text-white">{m.title}</p>
          <p className="mt-1 text-sm text-slate-400">{m.text}</p>
          {i < MOMENTS.length - 1 && <span className="absolute top-1/2 -right-2.5 hidden text-slate-600 md:block">→</span>}
        </div>
      ))}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 md:col-span-3 xl:col-span-1">
        <p className="font-mono text-xs text-emerald-300">bonus</p>
        <p className="mt-1 font-semibold text-white">Every store its own cards</p>
        <p className="mt-1 text-sm text-slate-300">Components are rows of data, so each merchant can have their own set. One deploy per tenant could never keep up.</p>
      </div>
    </div>
  );
}
