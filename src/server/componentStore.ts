/**
 * BACKEND · server/componentStore.ts — reading and writing composite components.
 *
 * The rest of the app only knows these functions; the SQL lives here and the
 * connection in server/db.ts. The agent calls listComposites() on every chat
 * request, so a component saved from /components is on the AI's menu from
 * the next message, with no deploy.
 */
import "server-only";

import { connection } from "next/server";
import { checkComponent } from "@/lib/catalog";
import { compositeSchema, type CompositeDef } from "@/lib/composites";
import type { ComponentHistory } from "@/lib/history";
import { db, inTransaction } from "@/server/db";

export async function listComposites(): Promise<CompositeDef[]> {
  await connection(); // node:sqlite is synchronous: make sure this runs per request, never at build time
  const rows = db().prepare("SELECT definition FROM components ORDER BY id").all() as { definition: string }[];
  return rows.map((r) => compositeSchema.parse(JSON.parse(r.definition)));
}

/** Adds a composite, or replaces the one with the same type. */
export async function saveComposite(input: unknown): Promise<{ problems: string[] }> {
  const all = await listComposites();
  const type = (input as { type?: unknown })?.type;
  const problems = checkComponent(input, all.filter((c) => c.type !== type));
  if (problems.length) return { problems };

  const def = compositeSchema.parse(input);
  const json = JSON.stringify(def);
  const exists = all.some((c) => c.type === def.type);
  const database = db();
  inTransaction(database, () => {
    if (exists) {
      database.prepare("UPDATE components SET definition = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE type = ?").run(json, def.type);
    } else {
      database.prepare("INSERT INTO components (type, definition, source) VALUES (?, ?, 'runtime')").run(def.type, json);
    }
    log(def.type, exists ? "updated" : "created", json);
  });
  return { problems: [] };
}

export async function deleteComposite(type: string): Promise<{ problems: string[] }> {
  const all = await listComposites();
  if (!all.some((c) => c.type === type)) return { problems: [`${type} does not exist`] };
  const users = all.filter((c) => Object.values(c.slots).some((s) => s.allow.includes(type)));
  if (users.length) return { problems: [`${type} is used by ${users.map((u) => u.type).join(", ")}`] };

  const database = db();
  inTransaction(database, () => {
    database.prepare("DELETE FROM components WHERE type = ?").run(type);
    log(type, "deleted", null);
  });
  return { problems: [] };
}

/** The rows and the change log, for the /runtime-components page. */
export async function componentHistory(): Promise<ComponentHistory> {
  await connection();
  const database = db();
  return {
    components: database.prepare("SELECT type, source, created_at AS createdAt, updated_at AS updatedAt FROM components ORDER BY id").all(),
    events: database.prepare("SELECT id, type, action, at FROM component_events ORDER BY id DESC LIMIT 20").all(),
  } as ComponentHistory;
}

function log(type: string, action: "created" | "updated" | "deleted", definition: string | null) {
  db().prepare("INSERT INTO component_events (type, action, definition) VALUES (?, ?, ?)").run(type, action, definition);
}
