/**
 * FRONTEND · components/registry.tsx — HOW each catalog item looks on screen.
 *
 * One entry per catalog component: "Page" -> this JSX, "Eyebrow" -> that JSX.
 * `props` = the values the LLM wrote. `children` = the child elements,
 * already rendered by json-render (that's how small components combine).
 *
 * Children are spaced with flex/grid gap, not margins (space-y): the canvas
 * inspector wraps every element in a display:contents span, which margins skip.
 *
 * Colours come from CSS variables set once by <Page>, so one instruction like
 * "make it dark and green" restyles every component at the same time.
 * Composites (stored as data) have no entry here: buildRegistry() adds one
 * <CompositeFrame> per composite at runtime.
 * Runs in the BROWSER. The LLM never sees this file.
 */
import { defineRegistry, type ComponentRegistry, type Components } from "@json-render/react";
import type { CSSProperties, ReactNode } from "react";
import { Badge, Body, Button, Caption, CompositeFrame, Eyebrow, Headline, LineItem, Meter, Price, ProductImage, Rating, Tag } from "@/components/screen";
import { baseCatalog, buildCatalog, type ACCENTS } from "@/lib/catalog";
import type { CompositeDef } from "@/lib/composites";

const ACCENT_HEX: Record<(typeof ACCENTS)[number], string> = {
  blue: "#2563eb",
  violet: "#7c3aed",
  emerald: "#059669",
  rose: "#e11d48",
  amber: "#d97706",
  slate: "#475569",
};
const MODES = {
  // Neutrals only: white page, white cards told apart by a hairline border.
  // The accent colour is the only colour, and it is used sparingly.
  light: { "--bg": "#ffffff", "--surface": "#ffffff", "--text": "#111111", "--muted": "#6b6b6b", "--border": "#e8e8e8", "--soft": "#f5f5f5" },
  dark: { "--bg": "#0b0b0b", "--surface": "#0b0b0b", "--text": "#ededed", "--muted": "#9a9a9a", "--border": "#262626", "--soft": "#161616" },
};

const components: Components<typeof baseCatalog> = {
  /* ---------- PAGE ---------- */
  Page: ({ props, children }) => {
    const accent = ACCENT_HEX[props.accent] ?? ACCENT_HEX.blue;
    // CSS variables aren't in React's style type, hence the cast.
    const theme = {
      ...(MODES[props.mode] ?? MODES.light),
      "--accent": accent,
      "--accent-soft": `color-mix(in srgb, ${accent} 14%, transparent)`,
    } as unknown as CSSProperties;
    return (
      <div
        style={theme}
        className="@container flex min-h-full flex-col gap-8 bg-[var(--bg)] p-[clamp(20px,4cqw,48px)] font-sans text-[var(--text)]"
      >
        {props.title && <p className="text-sm text-[var(--muted)]">{props.title}</p>}
        {children}
      </div>
    );
  },

  /* ---------- ATOMS (components/screen/) ---------- */
  Eyebrow: ({ props }) => <Eyebrow text={props.text} />,
  Headline: ({ props }) => <Headline text={props.text} />,
  Body: ({ props }) => <Body text={props.text} />,
  Caption: ({ props }) => <Caption text={props.text} />,
  Tag: ({ props }) => <Tag label={props.label} value={props.value} />,
  ProductImage: ({ props }) => <ProductImage emoji={props.emoji} alt={props.alt} />,
  Price: ({ props }) => <Price price={props.price} was={props.was} />,
  Rating: ({ props }) => <Rating stars={props.stars} count={props.count} />,
  Badge: ({ props }) => <Badge text={props.text} tone={props.tone} />,
  Meter: ({ props }) => <Meter label={props.label} percent={props.percent} />,
  LineItem: ({ props }) => <LineItem label={props.label} detail={props.detail} value={props.value} strong={props.strong} />,
  Button: ({ props }) => <Button label={props.label} variant={props.variant} />,
};

/**
 * The registry for one set of composites: the code components above, plus one
 * entry per composite, all drawn by the same <CompositeFrame> from its definition.
 * Adding a composite from /components therefore needs no new React code.
 */
export function buildRegistry(composites: CompositeDef[]): ComponentRegistry {
  const frames = Object.fromEntries(composites.map((def) => [def.type, frameFor(def)]));
  // Composites only exist at runtime, so TypeScript can't check `frames` against the catalog.
  return defineRegistry(buildCatalog(composites), { components: { ...components, ...frames } } as never).registry;
}

function frameFor(def: CompositeDef) {
  return function Frame({ props, slots }: { props: { layout: string }; slots?: Record<string, ReactNode> }) {
    return <CompositeFrame def={def} layout={props.layout} slots={slots} />;
  };
}
