/**
 * FRONTEND · components/runtime/flowData.ts — the REAL data behind each step of /runtime-components.
 *
 * Nothing on that page is a screenshot: it reads the component store, runs the
 * same check the API runs, and builds the same prompt the agent sends.
 *   - before you save FlashDealCard: we show what WILL happen (store + the demo card)
 *   - after you save it: we show the database rows and the prompt as they are now
 *   - after you ask for deals: step 8 shows the LLM's own output, from the trace
 */
import { buildInstructions, checkComponent } from "@/lib/catalog";
import type { CompositeDef } from "@/lib/composites";
import { FLASH_DEAL_CARD } from "@/lib/demoComponent";
import { sampleElements } from "@/lib/samples";
import type { ComponentHistory } from "@/lib/history";
import type { Trace } from "@/lib/trace";

export type FlowData = ReturnType<typeof flowData>;

export function flowData(composites: CompositeDef[], traces: Trace[], history: ComponentHistory | null) {
  const saved = composites.find((c) => c.type === FLASH_DEAL_CARD.type);
  const def = saved ?? FLASH_DEAL_CARD;
  const others = composites.filter((c) => c.type !== def.type);
  const withDeal = [...others, def]; // the menu once it is saved

  // A merchandiser's typo: an atom that doesn't exist, and a layout that forgets a slot.
  const broken = {
    ...FLASH_DEAL_CARD,
    slots: { ...FLASH_DEAL_CARD.slots, ends: { ...FLASH_DEAL_CARD.slots.ends, allow: ["Countdown"] } },
    layouts: { ...FLASH_DEAL_CARD.layouts, "image-top": ["media", "badges", "header", "claimed", "ends", "actions"] },
  };

  // The lines of the system prompt that exist only because of the new component.
  const promptLines = buildInstructions(withDeal)
    .split("\n")
    .filter((line) => line.includes(def.type));

  // The newest chat turn that used it, if any (traces are recorded by the chat).
  const used = traces.find((t) => t.server?.rawOutput.includes(`"${def.type}"`));

  return {
    def,
    saved: !!saved,
    storeTypes: withDeal.map((c) => c.type),
    dbRows: history && dbSnapshot(history),
    problems: checkComponent(broken, others),
    promptLines,
    used,
    sampleLines: used ? null : samplePatchLines(def, withDeal),
    withDeal,
  };
}

/** The two tables as text: what `sqlite3 data/app.db` would print. */
function dbSnapshot({ components, events }: ComponentHistory): string {
  const time = (iso: string) => iso.replace("T", " ").slice(0, 19);
  const rows = components.map((c) => `${c.type.padEnd(17)}${c.source.padEnd(9)}${time(c.updatedAt)}`);
  const log = events.slice(0, 8).map((e) => `#${String(e.id).padEnd(4)}${e.type.padEnd(17)}${e.action.padEnd(9)}${time(e.at)}`);
  return [
    "components",
    `${"type".padEnd(17)}${"source".padEnd(9)}updated_at`,
    ...rows,
    "",
    "component_events (latest first)",
    ...log,
  ].join("\n");
}

/** What the LLM's spec lines look like when it uses the card, with sample content. */
function samplePatchLines(def: CompositeDef, all: CompositeDef[]): string {
  const { key, elements } = sampleElements(def, all, "deal");
  const lines = [
    { op: "add", path: "/root", value: "page" },
    { op: "add", path: "/elements/page", value: { type: "Page", props: { title: "Today's deals", accent: "rose", mode: "light" }, children: [key] } },
    // The card first, then its atoms: the same order the LLM writes them.
    { op: "add", path: `/elements/${key}`, value: elements[key] },
    ...Object.entries(elements)
      .filter(([k]) => k !== key)
      .map(([k, value]) => ({ op: "add", path: `/elements/${k}`, value })),
  ];
  return lines.map((l) => JSON.stringify(l)).join("\n");
}

/** Only the ```spec block of the LLM's raw output: the JSON patch lines. */
export function specLines(raw: string): string {
  const match = /```spec\n([\s\S]*?)(```|$)/.exec(raw);
  return (match?.[1] ?? raw).trim();
}
