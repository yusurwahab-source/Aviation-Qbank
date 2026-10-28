import Image from "next/image";
import Link from "next/link";

import { HeroButton } from "@/components/ui/hero-button";
import { HERO_IMAGE, HERO_VIDEO_SRC } from "@/lib/product-cards";

import { HeaderOverHero } from "./header-over-hero";
import { HeroVideo } from "./hero-video";

/**
 * The homepage hero: the cockpit photograph edge to edge, running up under
 * the header (the `hero-under-header` class is what globals.css keys that
 * on), with the heading and tagline over its dark left side. A navy scrim
 * from the left and another from the top keep the white text and the
 * header's links readable whatever replaces the picture later.
 *
 * The picture is the one image on the page loaded eagerly and at high fetch
 * priority (`priority` is deprecated in Next 16; its docs point here
 * instead). When `HERO_VIDEO_SRC` is set, a looping clip plays over it
 * (`hero-video.tsx`); the heading and tagline stay real text above both.
 * The top padding clears the header, and the text lines up with the
 * page's own content column beneath.
 */
export function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="hero-under-header relative isolate h-[22rem] overflow-hidden bg-hero-scrim sm:h-[25rem] lg:h-[29rem]"
    >
      <Image
        src={HERO_IMAGE.src}
        alt={HERO_IMAGE.alt}
        fill
        loading="eager"
        fetchPriority="high"
        sizes="100vw"
        className="object-cover object-[70%_75%]"
      />
      {HERO_VIDEO_SRC && (
        <HeroVideo src={HERO_VIDEO_SRC} className="absolute inset-0 h-full w-full object-cover object-[70%_75%]" />
      )}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-hero-scrim/85 via-hero-scrim/40 to-transparent" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-hero-scrim/70 to-transparent" />
      <div className="relative mx-auto flex h-full w-full max-w-5xl flex-col justify-start px-4 pt-24 sm:justify-center sm:px-5 sm:pt-14">
        <div className="max-w-[85%] sm:max-w-xl">
          <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-hero-accent/30 bg-hero-scrim/80 px-3 py-1 text-xs font-semibold tracking-wide text-hero-accent backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-hero-accent" />
            <span>EASA ATPL &amp; Type Rating Ground School</span>
          </div>
          <h1 id="hero-heading" className="text-2xl font-bold tracking-tight text-on-hero sm:text-3xl lg:text-4xl">
            Your Aviation Study Hub
          </h1>
          <p className="mt-1.5 whitespace-nowrap text-xs font-bold tracking-wider uppercase text-hero-accent sm:mt-2 sm:text-sm lg:text-base">
            Study. Understand. Fly.
          </p>
          <p className="mt-2 text-xs sm:text-sm text-on-hero/85 leading-relaxed max-w-md hidden sm:block">
            Master aircraft systems and pass your theoretical exams with confidence. 14,000+ verified multiple-choice questions with detailed technical explanations.
          </p>
          <div className="mt-4 sm:mt-6 flex flex-wrap items-center gap-3">
            <HeroButton asChild size="sm" className="hb-on-hero">
              <Link href="/atpl-ground-school">Start practising</Link>
            </HeroButton>
            <Link
              href="/aircraft-systems"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-white/20 bg-hero-scrim/60 px-3.5 text-xs font-semibold text-on-hero backdrop-blur-sm transition hover:bg-hero-scrim/90 hover:border-hero-accent/40"
            >
              Aircraft Systems →
            </Link>
          </div>
        </div>
      </div>
      <HeaderOverHero />
    </section>
  );
}
