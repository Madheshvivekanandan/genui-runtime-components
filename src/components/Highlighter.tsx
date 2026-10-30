/**
 * FRONTEND · components/Highlighter.tsx — outline every piece of the page, by kind.
 *
 *   atom        (blue, solid)    : Eyebrow, Headline, Tag… React code, the AI fills the props
 *   component   (violet, solid)  : ProductCard, CartSummary… a definition stored as data
 *   built-in    (green, dashed)  : Page, the root written in code
 *   frame       (amber, dashed)  : what a component draws itself: its slot regions
 *                                  (with their layout style), dividers, column lines, tab, toggle
 *
 * Pure CSS, no measuring: one rule per element key, aimed at the element json-render
 * wraps in <span data-jr-key> (devtools mode). So the outlines follow the page while it
 * streams, resizes or an accordion collapses.
 */
"use client";

import { markDevtoolsActive, type Spec } from "@json-render/core";
import { useEffect, useId, useMemo, type ReactNode } from "react";
import { ATOM_TYPES } from "@/lib/catalog";
import type { CompositeDef } from "@/lib/composites";
import { descendantKeys } from "@/lib/spec";

/** Highlight the whole page (otherwise pass one element's key to highlight just its pieces). */
export const ALL = "*";

const COLOR = { atom: "#0284c7", component: "#7c3aed", builtin: "#059669", frame: "#d97706" };

/** The class to put on the preview container, and the style element to render inside it. */
export function useHighlight(spec: Spec, composites: CompositeDef[], scope: string | null): { className?: string; styles: ReactNode } {
  const on = scope !== null;
  useEffect(() => (on ? markDevtoolsActive() : undefined), [on]); // the rules target <span data-jr-key>
  const cls = `hl-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const css = useMemo(() => (scope ? highlightCss(spec, composites, scope, cls) : ""), [spec, composites, scope, cls]);
  return on ? { className: cls, styles: <style>{css}</style> } : { styles: null };
}

/** A container that highlights the pieces of whatever page is rendered inside it. */
export function HighlightBox({ spec, composites, scope, children }: { spec: Spec; composites: CompositeDef[]; scope: string | null; children: ReactNode }) {
  const { className, styles } = useHighlight(spec, composites, scope);
  return (
    <div className={className}>
      {styles}
      {children}
    </div>
  );
}

export function HighlightLegend() {
  const chip = (label: string, color: string, dashed = false) => (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span className="inline-block size-2.5 rounded-sm border-2" style={{ borderColor: color, borderStyle: dashed ? "dashed" : "solid" }} />
      {label}
    </span>
  );
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
      {chip("atom · code", COLOR.atom)}
      {chip("component · data", COLOR.component)}
      {chip("drawn by the component", COLOR.frame, true)}
      {chip("built-in layout", COLOR.builtin, true)}
    </span>
  );
}

const quote = (s: string) => `"${s.replace(/["\\]/g, "\\$&")}"`;

const CHIP =
  "position:absolute;z-index:20;pointer-events:none;white-space:nowrap;padding:0 5px;border-radius:4px;color:#fff;" +
  "font:600 10px/16px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:normal;text-transform:none;text-align:left;" +
  "box-shadow:0 1px 2px rgba(0,0,0,.25);";

function builtinLabel(el: Spec["elements"][string]): string {
  return el.type === "Page" ? "Page · stacks its children" : el.type;
}

function highlightCss(spec: Spec, composites: CompositeDef[], scope: string, cls: string): string {
  const top = scope === ALL ? spec.root : scope;
  const keys = [top, ...descendantKeys(spec, top)];
  const rules: string[] = [];

  for (const key of keys) {
    const el = spec.elements[key];
    if (!el) continue;
    const def = composites.find((c) => c.type === el.type);
    const kind = def ? "component" : (ATOM_TYPES as readonly string[]).includes(el.type) ? "atom" : "builtin";
    const color = COLOR[kind];
    const self = `.${cls} [data-jr-key=${quote(key)}] > :first-child`;
    // Round the outline, but leave elements alone that already have a background and corners.
    const round = (kind === "atom" && el.type !== "Tag") || def?.frame === "plain";
    const isPage = key === spec.root && el.type === "Page";
    const offset = isPage ? -4 : kind === "component" ? 6 : 3;
    rules.push(
      `${self}{position:relative;outline:2px ${kind === "builtin" ? "dashed" : "solid"} ${color};outline-offset:${offset}px;${round ? "border-radius:8px;" : ""}}`,
    );
    const label = kind === "atom" ? el.type : kind === "component" ? `${el.type} · component` : builtinLabel(el);
    // Atoms label above-left, components below-left (so a ProductCard's label doesn't sit on its first atom's).
    const at = isPage
      ? "top:8px;left:8px;"
      : kind === "component"
        ? `bottom:calc(-16px - ${offset + 2}px);left:-${offset}px;`
        : `top:calc(-16px - ${offset + 1}px);left:-${offset}px;`;
    rules.push(`${self}::before{content:${quote(label)};${at}${CHIP}background:${color};}`);

    if (!def) continue;
    // What this component draws itself: its own parts, not those of a component nested inside it.
    const own = `.${cls} [data-jr-key=${quote(key)}]`;
    const mine = (sel: string) => `${own} ${sel}:not(${own} [data-jr-key] ${sel})`;
    const frame = COLOR.frame;
    if (def.frame !== "plain") {
      rules.push(
        `${mine("[data-slot]")}{position:relative;outline:1.5px dashed ${frame};outline-offset:3px;border-radius:6px;}`,
        `${mine("[data-slot]")}::before{content:"slot " attr(data-slot) " · " attr(data-slot-style);top:-19px;right:-3px;${CHIP}background:${frame};}`,
      );
    }
    rules.push(
      `${mine('[data-frame-part="divider"]')}{position:relative;outline:1.5px dashed ${frame};outline-offset:-1px;border-radius:4px;}`,
      `${mine('[data-frame-part="divider"]')}::before{content:"divider · drawn by ${el.type}";top:50%;right:4px;transform:translateY(-50%);${CHIP}background:${frame};}`,
      `${mine('[data-frame-part^="tab:"]')}{outline:1.5px dashed ${frame};outline-offset:3px;}`,
      `${mine('[data-frame-part^="tab:"]')}::after{content:"tab · drawn by ${el.type}";top:-19px;left:calc(100% + 8px);${CHIP}background:${frame};}`,
      `${mine('[data-frame-part="toggle"]')}{position:relative;outline:1.5px dashed ${frame};outline-offset:3px;}`,
      `${mine('[data-frame-part="toggle"]')}::before{content:"toggle";top:calc(100% + 6px);right:0;${CHIP}background:${frame};}`,
    );
  }
  return rules.join("\n");
}
