"use client";

import { useEffect, useRef, useState } from "react";

type NetworkInformation = { saveData?: boolean };

/**
 * The hero's looping background clip, laid over the hero picture rather
 * than replacing it. The picture stays the first paint and the
 * accessible image; the clip is decoration, so it is hidden from
 * assistive technology and fades in only once it is actually playing.
 *
 * Nothing is fetched until this runs in the browser (`preload="none"`
 * and no `src` in the markup), and nothing is fetched at all for anyone
 * who asked for reduced motion or less data — they keep the still
 * picture underneath. Turning reduced motion on mid-visit stops it.
 */
export function HeroVideo({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    if (reducedMotion.matches || connection?.saveData) return;

    // Autoplay is only allowed muted; set it on the element, not just the
    // attribute, which React does not reliably reflect.
    video.muted = true;
    video.src = src;
    video.play().catch(() => {
      // Autoplay refused (power saving, a strict browser): the picture stays.
    });

    const stop = (event: MediaQueryListEvent) => {
      if (!event.matches) return;
      video.pause();
      setPlaying(false);
    };
    reducedMotion.addEventListener("change", stop);
    return () => reducedMotion.removeEventListener("change", stop);
  }, [src]);

  return (
    <video
      ref={ref}
      aria-hidden="true"
      tabIndex={-1}
      muted
      loop
      playsInline
      preload="none"
      disablePictureInPicture
      onPlaying={() => setPlaying(true)}
      className={`${className ?? ""} transition-opacity duration-700 ${playing ? "opacity-100" : "opacity-0"}`}
    />
  );
}
