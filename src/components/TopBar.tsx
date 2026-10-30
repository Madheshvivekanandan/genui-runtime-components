/**
 * FRONTEND · components/TopBar.tsx — the one navigation bar, on every page.
 *
 * Name on the left, four plain text links, room for one action on the right.
 * On the assistant page the links open a new tab, so the chat keeps its
 * messages while you add a component on /components.
 */
import Link from "next/link";
import type { ReactNode } from "react";

const LINKS = [
  { href: "/", label: "Assistant" },
  { href: "/components", label: "Components" },
  { href: "/runtime-components", label: "Runtime flow" },
  { href: "/how-it-works", label: "How it works" },
];

export function TopBar({ current, newTab = false, children }: { current: string; newTab?: boolean; children?: ReactNode }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-6 border-b border-line px-5 text-sm">
      <Link href="/" className="font-semibold tracking-tight text-fg">
        Runtime Components
      </Link>
      <nav className="flex items-center gap-5">
        {LINKS.map((l) =>
          l.href === current ? (
            <span key={l.href} aria-current="page" className="text-fg">
              {l.label}
            </span>
          ) : (
            <Link key={l.href} href={l.href} target={newTab ? "_blank" : undefined} className="text-muted transition hover:text-fg">
              {l.label}
            </Link>
          ),
        )}
      </nav>
      <div className="ml-auto flex items-center gap-3">{children}</div>
    </header>
  );
}
