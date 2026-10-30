/**
 * FRONTEND · components/screen/context.tsx — what an atom knows about where it sits.
 *
 *   SlotLabels   : turn the blue "product.price" chips on or off (Canvas "Show")
 *   ScopeContext : which slot / field label an atom shows, set by CompositeFrame
 *   FrameContext : which frame the atom is in (a Headline is bigger on a panel)
 */
"use client";

import { createContext, useContext } from "react";
import type { CompositeDef } from "@/lib/composites";

/* ---------- Slot labels ---------- */

const LabelsOn = createContext(false);
export const SlotLabels = LabelsOn.Provider;
export const useLabelsOn = () => useContext(LabelsOn);

// The label an atom shows for a field. `item` is set on item i of a repeating slot (products[1]).
export type Scope = { label: (field: string) => string | null; item?: { slot: string; index: number } };
export const NO_LABEL: Scope = { label: () => null };
export const ScopeContext = createContext<Scope>(NO_LABEL);

export function useFieldLabel(field: string): string | null {
  const on = useContext(LabelsOn);
  const scope = useContext(ScopeContext);
  return on ? scope.label(field) : null;
}

export function FieldLabel({ text, className = "" }: { text: string | null; className?: string }) {
  if (!text) return null;
  return (
    <span
      className={`inline-block rounded bg-accent/10 px-1 py-px align-middle font-slot text-xs leading-snug font-medium text-accent ${className}`}
    >
      {text}
    </span>
  );
}

/* ---------- Frame ---------- */

export type FrameKind = CompositeDef["frame"] | "page";
export const FrameContext = createContext<FrameKind>("page");
export const useFrame = () => useContext(FrameContext);
