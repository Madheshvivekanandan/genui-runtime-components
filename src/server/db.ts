/**
 * BACKEND · server/db.ts — the database. Runs ONLY on the server.
 *
 * SQLite, built into Node (node:sqlite): no server to run, no package to
 * install. The file (data/app.db) is created on first use and filled with
 * the seed components from data/seed-components.json.
 *
 * Two tables:
 *   components        one row per component: its JSON definition, and whether
 *                     it shipped with the app ("seed") or was added at runtime
 *   component_events  every create / update / delete, never edited: the
 *                     history of the catalog ("FlashDealCard added at 10:00")
 *
 * Swap this file for Postgres and componentStore.ts keeps the same functions.
 */
import "server-only";

import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { compositeSchema } from "@/lib/composites";

const FILE = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "app.db");
const SEED = path.join(process.cwd(), "data", "seed-components.json");

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS components (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,      -- keeps the order they were added in
    type       TEXT NOT NULL UNIQUE,                   -- e.g. "FlashDealCard"
    definition TEXT NOT NULL,                          -- the JSON, checked before it is written
    source     TEXT NOT NULL CHECK (source IN ('seed', 'runtime')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
  CREATE TABLE IF NOT EXISTS component_events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    type       TEXT NOT NULL,
    action     TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
    definition TEXT,                                   -- after the change (null when deleted)
    at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
`;

// One connection per server process. Kept on globalThis because the dev
// server reloads modules on every edit, which would otherwise open new ones.
const cached = globalThis as typeof globalThis & { componentDb?: DatabaseSync };

export function db(): DatabaseSync {
  if (!cached.componentDb) cached.componentDb = open();
  return cached.componentDb;
}

function open(): DatabaseSync {
  mkdirSync(path.dirname(FILE), { recursive: true });
  const database = new DatabaseSync(FILE);
  database.exec("PRAGMA journal_mode = WAL;"); // readers don't wait for a writer
  database.exec(SCHEMA);
  const { n } = database.prepare("SELECT count(*) AS n FROM components").get() as { n: number };
  if (n === 0) seed(database);
  return database;
}

/** First run: copy the seed file into the table (and the history). */
function seed(database: DatabaseSync) {
  const defs = compositeSchema.array().parse(JSON.parse(readFileSync(SEED, "utf8")));
  inTransaction(database, () => {
    const insert = database.prepare("INSERT INTO components (type, definition, source) VALUES (?, ?, 'seed')");
    const log = database.prepare("INSERT INTO component_events (type, action, definition) VALUES (?, 'created', ?)");
    for (const def of defs) {
      const json = JSON.stringify(def);
      insert.run(def.type, json);
      log.run(def.type, json);
    }
  });
}

/** Runs `work` as one unit: all of it is written, or none of it. */
export function inTransaction<T>(database: DatabaseSync, work: () => T): T {
  database.exec("BEGIN");
  try {
    const result = work();
    database.exec("COMMIT");
    return result;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}
