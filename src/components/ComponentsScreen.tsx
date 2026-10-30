/**
 * FRONTEND · components/ComponentsScreen.tsx — the component library at /components.
 *
 *   Screen preview : every screen-level composite with sample content (lib/samples.ts)
 *   Components     : the composites in the database, with preview, edit, delete
 *   Atoms          : the code components composites are built from
 *   Add component  : a form that saves a new composite (POST /api/components).
 *                    The agent reads the database on every request, so the new
 *                    component is on its menu from the next chat message.
 */
"use client";

import { useState, type ReactNode } from "react";
import { Preview } from "@/components/Canvas";
import { AtomPicker } from "@/components/library/AtomPicker";
import { TopBar } from "@/components/TopBar";
import { deleteComposite, saveComposite, useComposites } from "@/components/compositeStore";
import { ATOM_TYPES, baseCatalog, checkComponent } from "@/lib/catalog";
import { FRAMES, SLOT_STYLES, type CompositeDef } from "@/lib/composites";
import { FLASH_DEAL_CARD } from "@/lib/demoComponent";
import { sampleProps, sampleScreen } from "@/lib/samples";

type SlotRow = { name: string; allow: string[]; min: number; max: number; style: CompositeDef["slots"][string]["style"] };
type Form = {
  type: string;
  name: string;
  description: string;
  frame: CompositeDef["frame"];
  screenSlot: string;
  slots: SlotRow[];
  layouts: { name: string; order: string }[];
};

const list = (text: string) => text.split(",").map((s) => s.trim()).filter(Boolean);

const toDef = (f: Form): CompositeDef => ({
  type: f.type.trim(),
  name: f.name.trim(),
  description: f.description.trim(),
  frame: f.frame,
  screenSlot: f.screenSlot.trim() || null,
  slots: Object.fromEntries(f.slots.map(({ name, ...rule }) => [name.trim(), rule])),
  layouts: Object.fromEntries(f.layouts.map((l) => [l.name.trim(), list(l.order)])),
});

const fromDef = (d: CompositeDef): Form => ({
  ...d,
  screenSlot: d.screenSlot ?? "",
  slots: Object.entries(d.slots).map(([name, rule]) => ({ name, ...rule })),
  layouts: Object.entries(d.layouts).map(([name, order]) => ({ name, order: order.join(", ") })),
});

// The starting point for "New component": the flash-deal card from the demo, ready to save.
const NEW_COMPONENT: Form = fromDef(FLASH_DEAL_CARD);

const input = "w-full rounded-md border border-line bg-page px-2.5 py-1.5 text-sm text-fg outline-none focus:border-muted";

export function ComponentsScreen() {
  const composites = useComposites();
  const [form, setForm] = useState<Form>(NEW_COMPONENT);
  const [labels, setLabels] = useState(false);

  return (
    <div className="min-h-dvh bg-page font-sans text-fg">
      <TopBar current="/components" />

      {!composites ? (
        <p className="p-10 text-center text-muted">Loading components…</p>
      ) : (
        <main className="mx-auto grid max-w-7xl gap-12 px-6 py-14 xl:grid-cols-[minmax(0,1fr)_28rem]">
          <div className="min-w-0 space-y-14">
            <header className="max-w-2xl space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">Components</h1>
              <p className="text-muted">Atoms are code. Components are data: add one here and the assistant can use it from the next message.</p>
            </header>
            <section className="space-y-3">
              <div className="flex flex-wrap items-baseline gap-3">
                <p title="Every component that fills a screen slot, with sample content" className="text-sm font-medium text-muted">
                  Screen preview
                </p>
                <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs text-muted select-none">
                  <input type="checkbox" checked={labels} onChange={(e) => setLabels(e.target.checked)} className="accent-current" />
                  Slot labels
                </label>
              </div>
              <div className="overflow-hidden rounded-lg bg-subtle">
                <Preview spec={sampleScreen(composites)} streaming={false} labels={labels} followScheme />
              </div>
            </section>

            <section className="space-y-4">
              <SectionTitle title={`Components · ${composites.length}`} note="rows in the database (data/app.db), drawn by one generic frame" />
              {composites.map((def) => (
                <ComponentCard key={def.type} def={def} composites={composites} labels={labels} onEdit={() => setForm(fromDef(def))} />
              ))}
            </section>

            <section className="space-y-4">
              <SectionTitle title={`Atoms · ${ATOM_TYPES.length}`} note="React code in components/screen.tsx; components are built from these" />
              <div className="grid gap-3 md:grid-cols-2">
                {ATOM_TYPES.map((type) => (
                  <AtomCard key={type} type={type} />
                ))}
              </div>
            </section>
          </div>

          <aside className="min-w-0 xl:sticky xl:top-8 xl:max-h-[calc(100dvh-4rem)] xl:self-start xl:overflow-y-auto">
            <ComponentForm form={form} setForm={setForm} composites={composites} labels={labels} />
          </aside>
        </main>
      )}
    </div>
  );
}

function SectionTitle({ title, note }: { title: string; note: string }) {
  // The note is a tooltip, not a second line: the heading alone carries the section.
  return (
    <h2 title={note} className="text-lg font-semibold tracking-tight text-fg">
      {title}
    </h2>
  );
}

function ComponentCard({ def, composites, labels, onEdit }: { def: CompositeDef; composites: CompositeDef[]; labels: boolean; onEdit: () => void }) {
  const [problems, setProblems] = useState<string[]>([]);
  const remove = async () => {
    if (confirm(`Delete ${def.type}? The agent stops using it from the next message.`)) setProblems(await deleteComposite(def.type));
  };
  return (
    <article className="overflow-hidden rounded-lg border border-line">
      <div className="space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <code className="text-sm font-semibold text-fg">{def.type}</code>
          <Pill>{def.frame}</Pill>
          {def.screenSlot && <Pill>screen slot: {def.screenSlot}</Pill>}
          <div className="ml-auto flex gap-1">
            <button onClick={onEdit} className="px-2 py-1 text-xs text-muted hover:text-fg">
              Edit
            </button>
            <button onClick={remove} className="px-2 py-1 text-xs text-muted hover:text-fg">
              Delete
            </button>
          </div>
        </div>
        <p className="text-sm text-muted">{def.description}</p>
        <div className="grid gap-x-6 gap-y-1 font-mono text-xs text-muted md:grid-cols-2">
          <div className="space-y-1">
            {Object.entries(def.slots).map(([slot, r]) => (
              <p key={slot}>
                <span className="text-fg">{slot}</span> <span className="text-muted">· {r.style} ·</span> {r.min}–{r.max} of {r.allow.join(", ")}
              </p>
            ))}
          </div>
          <div className="space-y-1">
            {Object.entries(def.layouts).map(([name, order]) => (
              <p key={name}>
                <span className="text-fg">{name}</span> <span className="text-muted">:</span> {order.join(" → ")}
              </p>
            ))}
          </div>
        </div>
        {problems.length > 0 && <Problems problems={problems} />}
      </div>
      <Preview spec={sampleScreen(composites, def)} streaming={false} labels={labels} followScheme />
    </article>
  );
}

function AtomCard({ type }: { type: (typeof ATOM_TYPES)[number] }) {
  const entry = baseCatalog.data.components[type];
  const props = Object.keys(entry.props.shape).join(", ");
  const spec = {
    root: "p",
    elements: {
      p: { type: "Page", props: { title: "", accent: "blue", mode: "light" }, children: ["a"] },
      a: { type, props: sampleProps(type), children: [] },
    },
  };
  return (
    <article className="overflow-hidden rounded-lg border border-line">
      <div className="p-4">
        <code className="text-sm font-semibold text-fg">{type}</code> <code className="text-xs text-muted">{`{ ${props} }`}</code>
        <p className="mt-1 text-xs text-muted">{entry.description}</p>
      </div>
      <Preview spec={spec} streaming={false} followScheme />
    </article>
  );
}

function ComponentForm({
  form,
  setForm,
  composites,
  labels,
}: {
  form: Form;
  setForm: (f: Form) => void;
  composites: CompositeDef[];
  labels: boolean;
}) {
  const [saved, setSaved] = useState<string | null>(null);
  const [serverProblems, setServerProblems] = useState<string[]>([]);
  const def = toDef(form);
  const others = composites.filter((c) => c.type !== def.type);
  const exists = others.length < composites.length;
  const duplicates = form.slots.map((s) => s.name.trim()).filter((n, i, all) => n && all.indexOf(n) !== i);
  const problems = [...duplicates.map((n) => `slot "${n}" is defined twice`), ...checkComponent(def, others)];
  const blocks = [...ATOM_TYPES, ...others.map((c) => c.type)];
  // The draft isn't stored yet, so the preview draws it with its own list of composites.
  const previewAll = [...others, def];

  const update = (patch: Partial<Form>) => {
    setForm({ ...form, ...patch });
    setSaved(null);
    setServerProblems([]);
  };
  const updateSlot = (i: number, patch: Partial<SlotRow>) => update({ slots: form.slots.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const updateLayout = (i: number, patch: Partial<Form["layouts"][number]>) =>
    update({ layouts: form.layouts.map((l, j) => (j === i ? { ...l, ...patch } : l)) });

  const save = async () => {
    const result = await saveComposite(def);
    setServerProblems(result);
    if (result.length === 0) setSaved(`Saved ${def.type}. The agent can use it from your next message.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-medium tracking-tight text-fg">{exists ? `Edit ${def.type}` : "Add a component"}</h2>
        <button onClick={() => update(NEW_COMPONENT)} className="ml-auto text-xs text-muted hover:text-fg">
          New component
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Type (for the AI)">
          <input className={input} value={form.type} onChange={(e) => update({ type: e.target.value })} />
        </Field>
        <Field label="Display name (slot label)">
          <input className={input} value={form.name} onChange={(e) => update({ name: e.target.value })} />
        </Field>
      </div>
      <Field label="Description: when should the AI use it?">
        <textarea className={input} rows={2} value={form.description} onChange={(e) => update({ description: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Frame">
          <select className={input} value={form.frame} onChange={(e) => update({ frame: e.target.value as Form["frame"] })}>
            {FRAMES.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </Field>
        <Field label="Screen slot">
          <input className={input} value={form.screenSlot} placeholder="none" onChange={(e) => update({ screenSlot: e.target.value })} />
        </Field>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted">Slots: what each named slot may hold</p>
        {form.slots.map((slot, i) => (
          <div key={i} className="space-y-2 border-t border-line pt-3">
            <div className="flex items-center gap-2 text-xs">
              <input className={`${input} w-28`} value={slot.name} aria-label="slot name" onChange={(e) => updateSlot(i, { name: e.target.value })} />
              <select className={`${input} w-28`} value={slot.style} aria-label="slot style" onChange={(e) => updateSlot(i, { style: e.target.value as SlotRow["style"] })}>
                {SLOT_STYLES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <input className={`${input} w-14`} type="number" min={0} value={slot.min} aria-label="min" onChange={(e) => updateSlot(i, { min: Number(e.target.value) })} />
              <span className="text-muted">to</span>
              <input className={`${input} w-14`} type="number" min={1} value={slot.max} aria-label="max" onChange={(e) => updateSlot(i, { max: Number(e.target.value) })} />
              <button onClick={() => update({ slots: form.slots.filter((_, j) => j !== i) })} aria-label="Remove slot" className="ml-auto px-1 text-muted hover:text-fg">
                ✕
              </button>
            </div>
            <AtomPicker options={blocks} value={slot.allow} onChange={(allow) => updateSlot(i, { allow })} />
          </div>
        ))}
        <button
          onClick={() => update({ slots: [...form.slots, { name: `slot${form.slots.length + 1}`, allow: ["Body"], min: 0, max: 1, style: "stack" }] })}
          className="text-xs text-muted hover:text-fg"
        >
          + Add slot
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted">Layouts the AI may pick: slot order top to bottom, &quot;divider&quot; draws a line</p>
        {form.layouts.map((layout, i) => (
          <div key={i} className="flex items-center gap-2">
            <input className={`${input} w-32`} value={layout.name} aria-label="layout name" onChange={(e) => updateLayout(i, { name: e.target.value })} />
            <input className={input} value={layout.order} aria-label="slot order" onChange={(e) => updateLayout(i, { order: e.target.value })} />
            <button onClick={() => update({ layouts: form.layouts.filter((_, j) => j !== i) })} aria-label="Remove layout" className="px-1 text-muted hover:text-fg">
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={() => update({ layouts: [...form.layouts, { name: `layout-${form.layouts.length + 1}`, order: form.slots.filter((s) => s.style !== "tab").map((s) => s.name).join(", ") }] })}
          className="text-xs text-muted hover:text-fg"
        >
          + Add layout
        </button>
      </div>

      {problems.length > 0 || serverProblems.length > 0 ? (
        <Problems problems={[...problems, ...serverProblems]} />
      ) : (
        <div className="overflow-hidden rounded-md border border-line">
          <p className="border-b border-line px-3 py-1.5 text-xs text-muted">Preview with sample content</p>
          <Preview spec={sampleScreen(previewAll, def)} composites={previewAll} streaming={false} labels={labels} followScheme />
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={problems.length > 0}
          className="rounded-md bg-fg px-4 py-2 text-sm font-medium text-page hover:opacity-85 disabled:opacity-30"
        >
          {exists ? `Update ${def.type}` : `Save ${def.type || "component"}`}
        </button>
        {saved && <p className="text-xs text-muted">{saved}</p>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1 text-xs font-medium text-muted">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return <span className="text-xs text-muted">{children}</span>;
}

function Problems({ problems }: { problems: string[] }) {
  return (
    <ul className="space-y-1 text-xs text-amber-700 dark:text-amber-400">
      {problems.map((p, i) => (
        <li key={i}>⚠ {p}</li>
      ))}
    </ul>
  );
}
