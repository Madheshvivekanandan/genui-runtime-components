/**
 * FRONTEND · components/runtime/useHistory.ts — the database rows behind the components.
 *
 * Fetches GET /api/components/history again whenever the list of components
 * changes (saved or deleted on /components, picked up when you come back).
 */
import { useEffect, useState } from "react";
import type { CompositeDef } from "@/lib/composites";
import type { ComponentHistory } from "@/lib/history";

export function useHistory(composites: CompositeDef[] | null): ComponentHistory | null {
  const [history, setHistory] = useState<ComponentHistory | null>(null);
  useEffect(() => {
    if (!composites) return;
    let stale = false;
    fetch("/api/components/history", { cache: "no-store" })
      .then((r) => r.json())
      .then((h: ComponentHistory) => !stale && setHistory(h))
      .catch(() => {}); // the step falls back to the list of types
    return () => void (stale = true);
  }, [composites]);
  return history;
}
