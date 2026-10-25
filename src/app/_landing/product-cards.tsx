import Link from "next/link";
import type { ReactNode } from "react";

import type { ProductCard } from "@/lib/product-cards";
import type { PillarKey } from "@/lib/pillars";

/**
 * The homepage's three resource cards: an icon, a title, one short line and
 * an arrow. Each card is real markup — never a flattened picture — so the
 * title is text a screen reader and a search engine can read. The cards are
 * the page's navigation, so there is deliberately no other button beside
 * them.
 */

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
  className: "h-7 w-7",
} as const;

const ICONS: Record<PillarKey, ReactNode> = {
  "atpl-ground-school": (
    <svg {...ICON_PROPS}>
      <path d="M4 5.5c2.2-1 4.8-1 7 0v12.8c-2.2-1-4.8-1-7 0V5.5Z" />
      <path d="M20 5.5c-2.2-1-4.8-1-7 0v12.8c2.2-1 4.8-1 7 0V5.5Z" />
    </svg>
  ),
  "aircraft-systems": (
    <svg {...ICON_PROPS}>
      <path d="M21.5 2.5 10.5 13.5" />
      <path d="M21.5 2.5 14.8 21.5 10.5 13.5 2.5 9.2 21.5 2.5Z" />
    </svg>
  ),
  "pilot-sims": (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v2.5M12 18v2.5M3.5 12H6M18 12h2.5M12 12l4-3" />
    </svg>
  ),
};

export function ProductCards({ cards }: { cards: ProductCard[] }) {
  if (cards.length === 0) return null;

  return (
    <section aria-label="Learning resources">
      <ul
        className={`mx-auto grid w-full gap-4 sm:gap-6 ${
          cards.length === 3
            ? "max-w-5xl md:grid-cols-3"
            : cards.length === 2
              ? "max-w-3xl md:grid-cols-2"
              : "max-w-md"
        }`}
      >
        {cards.map((card) => (
          <li key={card.key} className="h-full">
            <ProductCardView card={card} icon={ICONS[card.key]} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * One link per card — on the title — stretched over the whole card with an
 * `after:` overlay, so the card is one tap target and one stop for a
 * keyboard, and the accessible name is the title itself.
 */
function ProductCardView({ card, icon }: { card: ProductCard; icon: ReactNode }) {
  return (
    <article className="group relative flex h-full items-center gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm transition focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-2 focus-within:ring-offset-background hover:border-brand hover:shadow-md motion-reduce:transition-none md:flex-col md:items-start md:gap-4 md:p-6">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-ink">
        {icon}
      </div>
      <div className="flex min-w-0 flex-1 flex-col md:w-full">
        <h2 className="text-lg font-semibold text-foreground">
          <Link
            href={card.href}
            className="outline-none after:absolute after:inset-0 after:content-['']"
          >
            {card.title}
          </Link>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{card.description}</p>
      </div>
      <span
        aria-hidden="true"
        className="shrink-0 text-lg font-semibold text-brand-ink transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none md:mt-auto"
      >
        →
      </span>
    </article>
  );
}
