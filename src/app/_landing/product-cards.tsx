import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import type { ProductCard } from "@/lib/product-cards";
import type { PillarKey } from "@/lib/pillars";

import simulatorImage from "./images/simulator-tools.webp";

/**
 * The homepage's three product cards: image, heading, one accurate sentence
 * and a way in. Each card is real markup — never a flattened picture — so
 * the heading is text a screen reader and a search engine can read.
 *
 * Images are 16:9 sources (1600×900) served by next/image, which picks the
 * size and format (AVIF/WebP) for the screen. A card whose image has not
 * been supplied yet shows a quiet tinted panel with its icon instead of a
 * stock photo: nothing on this page should picture something the product
 * is not. The Simulator & Tools image is a real screenshot of the VOR/NDB
 * trainer's HSI, captured from `public/pilot-sims/vor-ndb.html`.
 *
 * To add a photograph later: drop a 1600×900 WebP/JPEG into `./images/`,
 * import it here and put it in `IMAGES` with its alt text and, if the
 * subject is off-centre, an `objectPosition` that keeps it in frame when the
 * card is narrow.
 */

type CardImage = { src: StaticImageData; alt: string; objectPosition?: string };

const IMAGES: Partial<Record<PillarKey, CardImage>> = {
  "pilot-sims": {
    src: simulatorImage,
    alt: "The VOR/NDB trainer's HSI showing a course deviation bar and FROM flag",
  },
};

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
  className: "h-10 w-10",
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

/** Sizes that match the grid below: one column under `md`, three above. */
const IMAGE_SIZES = "(min-width: 1024px) 320px, (min-width: 768px) 33vw, 100vw";

export function ProductCards({ cards }: { cards: ProductCard[] }) {
  if (cards.length === 0) return null;

  return (
    <section aria-labelledby="product-cards-heading">
      <h2 id="product-cards-heading" className="sr-only">
        What you can study
      </h2>
      <ul
        className={`mx-auto grid max-w-5xl grid-cols-1 gap-6 ${
          cards.length === 3 ? "md:grid-cols-3" : cards.length === 2 ? "md:grid-cols-2" : "max-w-md"
        }`}
      >
        {cards.map((card) => (
          <li key={card.key} className="h-full">
            <ProductCardView card={card} image={IMAGES[card.key]} icon={ICONS[card.key]} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * One link per card — on the heading — stretched over the whole card with
 * an `after:` overlay, so the card is one tap target and one stop for a
 * keyboard, and the accessible name is the heading itself rather than a
 * repeated "Explore".
 */
function ProductCardView({
  card,
  image,
  icon,
}: {
  card: ProductCard;
  image: CardImage | undefined;
  icon: ReactNode;
}) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-2 focus-within:ring-offset-background hover:shadow-md motion-reduce:transition-none">
      <div className="relative aspect-video w-full overflow-hidden bg-surface-muted">
        {image ? (
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes={IMAGE_SIZES}
            placeholder="blur"
            className="object-cover"
            style={image.objectPosition ? { objectPosition: image.objectPosition } : undefined}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-brand-soft text-brand-ink">
            {icon}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h3 className="text-lg font-semibold text-foreground">
          <Link
            href={card.href}
            className="outline-none after:absolute after:inset-0 after:content-['']"
          >
            {card.title}
          </Link>
        </h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{card.description}</p>
        <span
          aria-hidden="true"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-ink"
        >
          Explore
          <span className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none">
            →
          </span>
        </span>
      </div>
    </article>
  );
}
