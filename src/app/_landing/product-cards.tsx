import Image from "next/image";
import Link from "next/link";

import type { ProductCard } from "@/lib/product-cards";

/**
 * The homepage's three resource cards. Each one reads top to bottom: the
 * title, one short line and an optional fact beside a round arrow, then the
 * picture inside the card beneath them. The text grows to fill the card, so
 * in the three-column row the pictures line up along the bottom whatever
 * the length of the text above them. Wider than tall on a phone (2:1) so the
 * three still sit close under the hero; 16:9 from `md`.
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
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-sm transition duration-300 focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-2 focus-within:ring-offset-background hover:-translate-y-0.5 hover:border-brand hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-5">
      <div className="flex flex-1 items-start gap-3">
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
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink transition duration-300 group-hover:bg-brand group-hover:text-on-solid motion-reduce:transition-none"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </span>
      </div>
      <div className="relative mt-4 aspect-[2/1] w-full overflow-hidden rounded-xl bg-surface-muted md:aspect-video">
        <Image
          src={card.image.src}
          alt={card.image.alt}
          fill
          sizes="(min-width: 768px) 320px, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </div>
    </article>
  );
}
