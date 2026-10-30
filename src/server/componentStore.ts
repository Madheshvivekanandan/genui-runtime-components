/**
 * BACKEND · server/componentStore.ts — where composite components are stored.
 *
 * A JSON file (data/components.json) stands in for a database table: one row
 * per composite. Swap these three functions for SQL and nothing else changes.
 * The agent reads the list on every request, so a component saved from
 * /components is on the AI's menu from the next message, with no deploy.
 */
import "server-only";

import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { checkComponent } from "@/lib/catalog";
import { compositeSchema, type CompositeDef } from "@/lib/composites";

const FILE = path.join(process.cwd(), "data", "components.json");

export async function listComposites(): Promise<CompositeDef[]> {
  return compositeSchema.array().parse(JSON.parse(await readFile(FILE, "utf8")));
}

/** Adds a composite, or replaces the one with the same type. */
export async function saveComposite(input: unknown): Promise<{ problems: string[] }> {
  const all = await listComposites();
  const type = (input as { type?: unknown })?.type;
  const problems = checkComponent(input, all.filter((c) => c.type !== type));
  if (problems.length) return { problems };

  const def = compositeSchema.parse(input);
  const index = all.findIndex((c) => c.type === def.type);
  if (index >= 0) all[index] = def;
  else all.push(def);
  await write(all);
  return { problems: [] };
}

export async function deleteComposite(type: string): Promise<{ problems: string[] }> {
  const all = await listComposites();
  if (!all.some((c) => c.type === type)) return { problems: [`${type} does not exist`] };
  const users = all.filter((c) => Object.values(c.slots).some((s) => s.allow.includes(type)));
  if (users.length) return { problems: [`${type} is used by ${users.map((u) => u.type).join(", ")}`] };
  await write(all.filter((c) => c.type !== type));
  return { problems: [] };
}

// Write to a temp file, then rename: a crash mid-write can't leave half a file.
async function write(all: CompositeDef[]) {
  await writeFile(`${FILE}.tmp`, JSON.stringify(all, null, 2) + "\n");
  await rename(`${FILE}.tmp`, FILE);
}
