/**
 * FRONTEND · components/runtime/StoryStrip.tsx — "why would anyone add components at runtime?"
 *
 * The use case in three moments, plus the reason it scales: one app, many stores.
 */
const MOMENTS = [
  { time: "10:00", title: "Sale starts", text: "A merchandiser adds a FlashDealCard on Components. No ticket, no pull request." },
  { time: "10:01", title: "Assistant uses it", text: "The next shopper who asks about deals gets the new card." },
  { time: "Sun 23:59", title: "Sale ends", text: "They delete it. The assistant stops using it on the next message." },
  { time: "Also", title: "Every store its own cards", text: "Components are rows of data, so each merchant can have their own set." },
];

export function StoryStrip() {
  return (
    <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {MOMENTS.map((m) => (
        <li key={m.time} className="border-t border-line pt-4">
          <p className="font-mono text-xs text-muted">{m.time}</p>
          <p className="mt-2 text-sm font-medium text-fg">{m.title}</p>
          <p className="mt-1 text-sm text-muted">{m.text}</p>
        </li>
      ))}
    </ol>
  );
}
