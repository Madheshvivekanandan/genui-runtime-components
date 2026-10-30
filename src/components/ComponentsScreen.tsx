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

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Preview } from "@/components/Canvas";
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

const input = "w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-500";

export function ComponentsScreen() {
  const composites = useComposites();
  const [form, setForm] = useState<Form>(NEW_COMPONENT);
  const [labels, setLabels] = useState(true);

  return (
    <div className="min-h-dvh bg-slate-950 font-sans text-slate-300">
      <header className="flex flex-wrap items-center gap-3 border-b border-white/10 px-6 py-4 lg:px-10">
        <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 font-bold text-white">G</span>
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-semibold text-white">Component library</h1>
          <p className="text-xs text-slate-400">Atoms are code. Components are data: add one here and the agent can use it from your next message.</p>
        </div>
        <Link href="/runtime-components" className="rounded-lg px-3 py-1.5 text-xs font-medium text-sky-400 hover:bg-sky-500/10">
          How saving works
        </Link>
        <Link href="/" className="rounded-lg px-3 py-1.5 text-xs font-medium text-sky-400 hover:bg-sky-500/10">
          ← Assistant
        </Link>
      </header>

      {!composites ? (
        <p className="p-10 text-center text-slate-500">Loading components…</p>
      ) : (
        <main className="grid gap-10 px-6 py-8 lg:px-10 xl:grid-cols-[minmax(0,1fr)_30rem]">
          <div className="min-w-0 space-y-12">
            <section className="space-y-3">
              <div className="flex flex-wrap items-end gap-3">
                <SectionTitle title="Screen preview" note="every component that fills a screen slot, with sample content" />
                <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs text-slate-400 select-none">
                  <input type="checkbox" checked={labels} onChange={(e) => setLabels(e.target.checked)} className="accent-indigo-500" />
                  Slot labels
                </label>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/10">
                <Preview spec={sampleScreen(composites)} streaming={false} labels={labels} />
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

          <aside className="min-w-0 xl:sticky xl:top-6 xl:max-h-[calc(100dvh-3rem)] xl:self-start xl:overflow-y-auto">
            <ComponentForm form={form} setForm={setForm} composites={composites} labels={labels} />
          </aside>
        </main>
      )}
    </div>
  );
}

function SectionTitle({ title, note }: { title: string; note: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-white">{title}</h2>
      <p className="text-xs text-slate-500">{note}</p>
    </div>
  );
}

function ComponentCard({ def, composites, labels, onEdit }: { def: CompositeDef; composites: CompositeDef[]; labels: boolean; onEdit: () => void }) {
  const [problems, setProblems] = useState<string[]>([]);
  const remove = async () => {
    if (confirm(`Delete ${def.type}? The agent stops using it from the next message.`)) setProblems(await deleteComposite(def.type));
  };
  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50">
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <code className="text-sm font-semibold text-white">{def.type}</code>
          <Pill>{def.frame}</Pill>
          {def.screenSlot && <Pill>screen slot: {def.screenSlot}</Pill>}
          <div className="ml-auto flex gap-1">
            <button onClick={onEdit} className="rounded-lg px-2.5 py-1 text-xs text-sky-400 hover:bg-sky-500/10">
              Edit
            </button>
            <button onClick={remove} className="rounded-lg px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-500/10">
              Delete
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-400">{def.description}</p>
        <div className="grid gap-x-6 gap-y-1 font-mono text-xs md:grid-cols-2">
          <div className="space-y-1">
            {Object.entries(def.slots).map(([slot, r]) => (
              <p key={slot}>
                <span className="text-violet-300">{slot}</span> <span className="text-slate-500">· {r.style} ·</span> {r.min}–{r.max} of {r.allow.join(", ")}
              </p>
            ))}
          </div>
          <div className="space-y-1">
            {Object.entries(def.layouts).map(([name, order]) => (
              <p key={name}>
                <span className="text-sky-300">{name}</span> <span className="text-slate-500">:</span> {order.join(" → ")}
              </p>
            ))}
          </div>
        </div>
        {problems.length > 0 && <Problems problems={problems} />}
      </div>
      <Preview spec={sampleScreen(composites, def)} streaming={false} labels={labels} />
    </article>
  );
}

function AtomCard({ type }: { type: (typeof ATOM_TYPES)[number] }) {
  const entry = baseCatalog.data.components[type];
  const props = Object.keys(entry.props.shape).join(", ");
  const spec = {
    root: "p",
    elements: {
      p: { type: "Page", props: { title: type, accent: "blue", mode: "light" }, children: ["a"] },
      a: { type, props: sampleProps(type), children: [] },
    },
  };
  return (
    <article className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/50">
      <div className="p-3">
        <code className="text-sm font-semibold text-white">{type}</code> <code className="text-xs text-slate-500">{`{ ${props} }`}</code>
        <p className="mt-1 text-xs text-slate-400">{entry.description}</p>
      </div>
      <Preview spec={spec} streaming={false} />
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
    <div className="space-y-5 rounded-2xl border border-white/10 bg-slate-900/60 p-5">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-white">{exists ? `Edit ${def.type}` : "Add a component"}</h2>
        <button onClick={() => update(NEW_COMPONENT)} className="ml-auto rounded-lg px-2.5 py-1 text-xs text-sky-400 hover:bg-sky-500/10">
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
        <p className="text-xs font-medium text-slate-400">Slots: what each named slot may hold</p>
        {form.slots.map((slot, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-white/10 p-3">
            <div className="flex items-center gap-2 text-xs">
              <input className={`${input} w-28`} value={slot.name} aria-label="slot name" onChange={(e) => updateSlot(i, { name: e.target.value })} />
              <select className={`${input} w-28`} value={slot.style} aria-label="slot style" onChange={(e) => updateSlot(i, { style: e.target.value as SlotRow["style"] })}>
                {SLOT_STYLES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <input className={`${input} w-14`} type="number" min={0} value={slot.min} aria-label="min" onChange={(e) => updateSlot(i, { min: Number(e.target.value) })} />
              <span className="text-slate-500">to</span>
              <input className={`${input} w-14`} type="number" min={1} value={slot.max} aria-label="max" onChange={(e) => updateSlot(i, { max: Number(e.target.value) })} />
              <button onClick={() => update({ slots: form.slots.filter((_, j) => j !== i) })} aria-label="Remove slot" className="ml-auto px-1 text-slate-500 hover:text-rose-400">
                ✕
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {blocks.map((t) => {
                const on = slot.allow.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => updateSlot(i, { allow: on ? slot.allow.filter((a) => a !== t) : [...slot.allow, t] })}
                    className={`rounded-full border px-2.5 py-0.5 font-mono text-[11px] ${on ? "border-violet-400/60 bg-violet-500/20 text-violet-200" : "border-white/10 text-slate-500 hover:text-slate-300"}`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <button
          onClick={() => update({ slots: [...form.slots, { name: `slot${form.slots.length + 1}`, allow: ["Body"], min: 0, max: 1, style: "stack" }] })}
          className="text-xs text-sky-400 hover:underline"
        >
          + Add slot
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-400">Layouts the AI may pick: slot order top to bottom, &quot;divider&quot; draws a line</p>
        {form.layouts.map((layout, i) => (
          <div key={i} className="flex items-center gap-2">
            <input className={`${input} w-32`} value={layout.name} aria-label="layout name" onChange={(e) => updateLayout(i, { name: e.target.value })} />
            <input className={input} value={layout.order} aria-label="slot order" onChange={(e) => updateLayout(i, { order: e.target.value })} />
            <button onClick={() => update({ layouts: form.layouts.filter((_, j) => j !== i) })} aria-label="Remove layout" className="px-1 text-slate-500 hover:text-rose-400">
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={() => update({ layouts: [...form.layouts, { name: `layout-${form.layouts.length + 1}`, order: form.slots.filter((s) => s.style !== "tab").map((s) => s.name).join(", ") }] })}
          className="text-xs text-sky-400 hover:underline"
        >
          + Add layout
        </button>
      </div>

      {problems.length > 0 || serverProblems.length > 0 ? (
        <Problems problems={[...problems, ...serverProblems]} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <p className="bg-slate-900 px-3 py-1.5 text-xs text-slate-500">Preview with sample content</p>
          <Preview spec={sampleScreen(previewAll, def)} composites={previewAll} streaming={false} labels={labels} />
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={problems.length > 0}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40"
        >
          {exists ? `Update ${def.type}` : `Save ${def.type || "component"}`}
        </button>
        {saved && <p className="text-xs text-emerald-400">{saved}</p>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1 text-xs font-medium text-slate-400">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-slate-300">{children}</span>;
}

function Problems({ problems }: { problems: string[] }) {
  return (
    <ul className="space-y-1 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
      {problems.map((p, i) => (
        <li key={i}>⚠ {p}</li>
      ))}
    </ul>
  );
}
