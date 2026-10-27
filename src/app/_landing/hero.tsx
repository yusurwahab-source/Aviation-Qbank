import Image from "next/image";

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
      className="hero-under-header relative isolate h-[30rem] overflow-hidden bg-hero-scrim sm:h-[34rem] lg:h-[40rem]"
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
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-hero-scrim/75 via-hero-scrim/30 to-transparent" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-hero-scrim/60 to-transparent" />
      <div className="relative mx-auto flex h-full w-full max-w-5xl flex-col justify-start px-4 pt-28 sm:justify-center sm:px-5 sm:pt-16">
        <div className="max-w-[75%] sm:max-w-lg">
          <h1 id="hero-heading" className="text-xl font-semibold tracking-tight text-on-hero sm:text-2xl lg:text-3xl">
            Your Aviation Study Hub
          </h1>
          <p className="mt-1.5 whitespace-nowrap text-sm font-medium tracking-wide text-hero-accent sm:mt-2 sm:text-base lg:text-lg">
            Study. Understand. Fly.
          </p>
        </div>
      </div>
      <HeaderOverHero />
    </section>
  );
}
