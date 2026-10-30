/**
 * FRONTEND · components/runtime/runtimeSteps.tsx — the 9 steps of /runtime-components.
 *
 * From "a merchandiser saves a FlashDealCard" to "a shopper sees one", with
 * the real data (components/runtime/flowData.ts) and the file at each step.
 */
"use client";

import { Preview } from "@/components/Canvas";
import { Data, Mono, type Step } from "@/components/explainer/blocks";
import { sampleScreen } from "@/lib/samples";
import { specLines, type FlowData } from "./flowData";

const ROUTE = `export async function POST(req: Request) {
  const { problems } = await saveComposite(await req.json());
  if (problems.length) return Response.json({ problems }, { status: 400 });
  return Response.json({ composites: await listComposites() });
}`;

const AGENT = `// server/agent.ts · streamAgentReply(), on EVERY chat request
const instructions = buildInstructions(await listComposites());

// lib/catalog.ts
export function buildCatalog(composites) {
  const entries = composites.map((def) => [def.type, {
    props: z.object({ layout: z.enum(layoutNames(def)) }),  // only approved layouts
    slots: Object.keys(def.slots),
    description: describeComposite(def),                   // what the AI reads
  }]);
  return defineCatalog(schema, { components: { ...BASE_COMPONENTS, ...entries } });
}`;

const REGISTRY = `// components/registry.tsx
export function buildRegistry(composites) {
  const frames = composites.map((def) => [def.type,
    ({ props, slots }) => <CompositeFrame def={def} layout={props.layout} slots={slots} />,
  ]);
  return defineRegistry(buildCatalog(composites), { components: { ...atoms, ...frames } });
}`;

export function runtimeSteps(d: FlowData): Step[] {
  const prompt = d.used?.userText ?? "Any flash deals on headphones today?";
  return [
    {
      lane: "browser",
      title: "10:00 · The merchandiser fills the form",
      where: "app/components · components/ComponentsScreen.tsx",
      summary: (
        <p>
          A 48-hour sale starts. On <Mono>/components</Mono> they describe a <b>{d.def.type}</b>: when to use it, which atoms go in which slot,
          and the layouts design approved. It is plain JSON, built only from atoms that already exist.
        </p>
      ),
      data: <Data label={d.saved ? "the definition, as stored" : "the definition the form starts with (lib/demoComponent.ts)"} value={JSON.stringify(d.def, null, 2)} />,
    },
    {
      lane: "browser",
      title: "The form checks it as they type",
      where: "lib/catalog.ts · checkComponent()",
      summary: (
        <p>
          The same function runs in the browser (live) and on the server (enforced). Unknown atoms, a layout that forgets a slot, min &gt; max: the
          Save button stays off. Example with a typo:
        </p>
      ),
      data: <Data label="checkComponent(definition with a typo) →" value={JSON.stringify(d.problems, null, 2)} />,
    },
    {
      lane: "browser",
      title: "Save → POST /api/components",
      where: "app/api/components/route.ts",
      summary: (
        <p>
          The browser sends the JSON. The route is only wiring: it hands the body to the store and answers with the problems (400) or the new list.
        </p>
      ),
      data: <Data label="route.ts" value={ROUTE} />,
    },
    {
      lane: "server",
      title: "Checked again, written to the store",
      where: "server/componentStore.ts → data/components.json",
      summary: (
        <p>
          <Mono>saveComposite()</Mono> parses it with the Zod schema, runs <Mono>checkComponent()</Mono> again (never trust the browser), then writes
          the file. A JSON file stands in for a database table. {d.saved ? <b>{d.def.type} is saved.</b> : <b>Not saved yet: save it on /components.</b>}
        </p>
      ),
      data: <Data label={`data/components.json · ${d.storeTypes.length} components${d.saved ? "" : " (after saving)"}`} value={JSON.stringify(d.storeTypes, null, 2)} />,
    },
    {
      lane: "browser",
      title: "10:01 · A shopper asks",
      where: "components/ChatScreen.tsx · useChat",
      summary: <p>Nothing was rebuilt or restarted. The chat sends the next message as usual.</p>,
      data: <Data label="the shopper's message" value={prompt} />,
    },
    {
      lane: "server",
      title: "The catalog is rebuilt for this request",
      where: "server/agent.ts · lib/catalog.ts",
      summary: (
        <p>
          The key line: the agent reads the store on <b>every</b> request and builds the catalog from it. Each composite gets one prop,{" "}
          <Mono>layout</Mono>, limited to its approved layouts.
        </p>
      ),
      data: <Data label="buildInstructions / buildCatalog" value={AGENT} />,
    },
    {
      lane: "server",
      title: `The prompt now lists ${d.def.type}`,
      where: "lib/catalog.ts · buildInstructions()",
      summary: (
        <p>
          json-render writes the system prompt from the catalog. These lines are new since 10:00. The description is how the LLM knows a deal question
          should get this card.
        </p>
      ),
      data: <Data label={`system prompt lines mentioning ${d.def.type}`} value={d.promptLines.join("\n\n")} />,
    },
    {
      lane: "llm",
      title: "The LLM uses it in the spec",
      where: "streamText · pipeJsonRender",
      summary: d.used ? (
        <p>
          This is what the model actually wrote ({d.used.server?.model}). It picked a layout, filled the named slots with atoms, and the validator
          found {d.used.problems.length ? `${d.used.problems.length} problem(s)` : "no problems"}.
        </p>
      ) : (
        <p>The model writes JSON patch lines. Sample content below; ask the chat about deals and this step shows the real output.</p>
      ),
      data: <Data label={d.used ? `real LLM output · "${d.used.userText}"` : "what the spec lines look like (sample content)"} value={d.used ? specLines(d.used.server?.rawOutput ?? "") : (d.sampleLines ?? "")} />,
    },
    {
      lane: "browser",
      title: "The browser draws it",
      where: "components/compositeStore.ts · registry.tsx · screen/CompositeFrame.tsx",
      summary: (
        <p>
          The browser fetches the same list and builds a registry: every composite maps to <b>one generic</b> <Mono>CompositeFrame</Mono>, which places
          the slots in the chosen layout. No React code was written for {d.def.type}.
        </p>
      ),
      data: (
        <div className="space-y-3">
          <Data label="buildRegistry" value={REGISTRY} />
          <div className="overflow-hidden rounded-xl border border-white/10">
            <Preview spec={sampleScreen(d.withDeal, d.def)} composites={d.withDeal} streaming={false} labels />
          </div>
        </div>
      ),
    },
  ];
}
