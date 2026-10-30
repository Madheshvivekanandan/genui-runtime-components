/**
 * scripts/db-reset.mjs — start over: delete the component database.
 *
 * The next request recreates it from data/seed-components.json, so every
 * component added at runtime (e.g. FlashDealCard) and its history is gone.
 * Stop `npm run dev` first: the running server keeps the old file open.
 */
import { rmSync } from "node:fs";

const file = process.env.DATABASE_PATH ?? "data/app.db";
for (const f of [file, `${file}-wal`, `${file}-shm`]) rmSync(f, { force: true });
console.log(`Deleted ${file}. It is re-seeded on the next request.`);
