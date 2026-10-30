/**
 * FRONTEND · components/compositeStore.ts — the composites, as the browser sees them.
 *
 *   useComposites   : the list from GET /api/components (null while loading)
 *   useRegistry     : the React registry for that list (code components + frames)
 *   saveComposite / deleteComposite : the /components page's buttons
 *
 * One shared copy for every component on the page; saving or deleting
 * refreshes it, so the canvas and previews redraw with the new component.
 */
import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { CompositeDef } from "@/lib/composites";
import { buildRegistry } from "@/components/registry";

let current: CompositeDef[] | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function set(next: CompositeDef[]) {
  current = next;
  listeners.forEach((l) => l());
}

export function refreshComposites(): Promise<void> {
  loading = fetch("/api/components", { cache: "no-store" })
    .then((r) => r.json())
    .then((d: { composites: CompositeDef[] }) => set(d.composites))
    .catch(() => void (loading = null)); // let the next component that mounts try again
  return loading;
}

/** The latest list, for code outside React (e.g. validating a saved trace). */
export const loadedComposites = () => current ?? [];

let watchingFocus = false;

export function useComposites(): CompositeDef[] | null {
  const value = useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => current,
    () => null,
  );
  useEffect(() => {
    if (!current && !loading) void refreshComposites();
    // A component saved in another tab (/components) shows up when you come back to this one.
    if (!watchingFocus) {
      watchingFocus = true;
      window.addEventListener("focus", () => void refreshComposites());
    }
  }, []);
  return value;
}

export function useRegistry() {
  const composites = useComposites();
  return useMemo(() => (composites ? buildRegistry(composites) : null), [composites]);
}

/** Returns the problems that stopped the save (empty = saved). */
export async function saveComposite(def: CompositeDef): Promise<string[]> {
  return send(fetch("/api/components", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(def) }));
}

export async function deleteComposite(type: string): Promise<string[]> {
  return send(fetch(`/api/components/${encodeURIComponent(type)}`, { method: "DELETE" }));
}

async function send(request: Promise<Response>): Promise<string[]> {
  const data: { composites?: CompositeDef[]; problems?: string[] } = await (await request).json();
  if (data.composites) set(data.composites);
  return data.problems ?? [];
}
