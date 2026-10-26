import Image from "next/image";
import Link from "next/link";

import type { ProductCard } from "@/lib/product-cards";

/**
 * The homepage's three resource cards: a 16:9 picture, a title, one short
 * line, an optional fact and an arrow. Below `md` each card is a row —
 * thumbnail beside the text — so all three fit on a phone screen under the
 * hero; from `md` they stand as three columns with the picture on top. The
 * picture keeps the same 16:9 crop in both.
 *
 * One link per card, on the title, stretched over the whole card, so the
 * card is one tap target and one stop for a keyboard.
 */
export function ProductCards({ cards }: { cards: ProductCard[] }) {
  if (cards.length === 0) return null;

  return (
    <section aria-label="Learning resources">
      <ul className={`grid gap-3 sm:gap-4 ${cards.length === 3 ? "md:grid-cols-3" : cards.length === 2 ? "md:grid-cols-2" : ""}`}>
        {cards.map((card) => (
          <li key={card.key}>
            <ProductCardView card={card} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProductCardView({ card }: { card: ProductCard }) {
  return (
    <article className="group relative flex h-full items-center gap-4 overflow-hidden rounded-xl border border-border bg-surface p-3 shadow-sm transition focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-2 focus-within:ring-offset-background hover:border-brand hover:shadow-md motion-reduce:transition-none md:flex-col md:items-stretch md:gap-0 md:p-0">
      <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-surface-muted sm:w-36 md:w-full md:rounded-none">
        <Image
          src={card.image.src}
          alt={card.image.alt}
          fill
          sizes="(min-width: 768px) 330px, 144px"
          className="object-cover"
        />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-3 md:items-end md:p-5">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold leading-snug text-foreground sm:text-lg">
            <Link href={card.href} className="outline-none after:absolute after:inset-0 after:content-['']">
              {card.title}
            </Link>
          </h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{card.description}</p>
          {card.meta ? <p className="mt-1 text-xs font-semibold text-brand-ink sm:text-sm">{card.meta}</p> : null}
        </div>
        <span
          aria-hidden="true"
          className="shrink-0 text-lg font-semibold text-brand-ink transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
        >
          →
        </span>
      </div>
    </article>
  );
}
