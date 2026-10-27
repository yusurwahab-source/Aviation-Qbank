"use client";

import { useEffect, useRef } from "react";

/**
 * Marks the homepage header solid (`data-solid` on `.site-top`) once the
 * hero has scrolled out from under it, and clear again on the way back up.
 * Until then globals.css keeps the header transparent over the photograph.
 * Renders nothing visible; it only needs a place inside the hero.
 */
export function HeaderOverHero() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const hero = ref.current?.closest("section");
    const top = document.querySelector<HTMLElement>(".site-top");
    if (!hero || !top) return;

    const headerHeight = top.querySelector("header")?.offsetHeight ?? 64;
    const observer = new IntersectionObserver(
      ([entry]) => top.toggleAttribute("data-solid", !entry.isIntersecting),
      { rootMargin: `-${headerHeight}px 0px 0px 0px` },
    );
    observer.observe(hero);

    return () => {
      observer.disconnect();
      top.removeAttribute("data-solid");
    };
  }, []);

  return <span ref={ref} hidden />;
}
