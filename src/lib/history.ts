/**
 * SHARED · lib/history.ts — the shape of GET /api/components/history.
 *
 * What the database knows about each component beyond its definition:
 * where it came from, when it changed, and the log of every change.
 *
 * Rule for lib/: no secrets, no React, no AI calls.
 */
export type ComponentRow = { type: string; source: "seed" | "runtime"; createdAt: string; updatedAt: string };
export type ComponentEvent = { id: number; type: string; action: "created" | "updated" | "deleted"; at: string };
export type ComponentHistory = { components: ComponentRow[]; events: ComponentEvent[] };
