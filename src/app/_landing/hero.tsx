import Image from "next/image";

import { HERO_IMAGE, HERO_VIDEO_SRC } from "@/lib/product-cards";

import { HeroVideo } from "./hero-video";

/**
 * A shallow image banner: the heading and tagline over the left of the
 * hero picture, which keeps its sky clear there for exactly this. A navy
 * scrim from the left keeps the white text readable whatever photograph
 * replaces the placeholder later, in both themes.
 *
 * Deliberately short — 16:9 on a phone, a wide band from `sm` — so the
 * three resource cards follow straight after it on a phone screen. It is
 * the one image on the page loaded eagerly and at high fetch priority
 * (`priority` is deprecated in Next 16; its docs point here instead).
 * When `HERO_VIDEO_SRC` is set, a looping clip plays over the picture
 * (`hero-video.tsx`); the heading and tagline stay real text above both.
 */
export function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative aspect-video overflow-hidden rounded-xl border border-border bg-surface-muted sm:aspect-[21/9] lg:aspect-[16/5]"
    >
      <Image
        src={HERO_IMAGE.src}
        alt={HERO_IMAGE.alt}
        fill
        loading="eager"
        fetchPriority="high"
        sizes="(min-width: 1024px) 990px, 100vw"
        className="object-cover object-[70%_75%]"
      />
      {HERO_VIDEO_SRC && (
        <HeroVideo src={HERO_VIDEO_SRC} className="absolute inset-0 h-full w-full object-cover object-[70%_75%]" />
      )}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-hero-scrim/70 via-hero-scrim/30 to-transparent" />
      <div className="relative flex h-full max-w-[75%] flex-col justify-center px-5 sm:max-w-lg sm:px-8 lg:px-10">
        <h1 id="hero-heading" className="text-xl font-semibold tracking-tight text-on-hero sm:text-2xl lg:text-3xl">
          Your Aviation Study Hub
        </h1>
        <p className="mt-1.5 whitespace-nowrap text-sm font-medium tracking-wide text-hero-accent sm:mt-2 sm:text-base">
          Study. Understand. Fly.
        </p>
      </div>
    </section>
  );
}
