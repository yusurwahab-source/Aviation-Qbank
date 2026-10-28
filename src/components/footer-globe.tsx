"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const GlobeWireframe = dynamic(() => import("@/components/ui/globe-wireframe"), { ssr: false });

/**
 * The footer's spinning globe. The footer is on every page, so neither the
 * globe's code (`d3-geo`, `topojson-client`) nor its map is fetched until
 * the footer comes within a screen of the viewport — a visitor who never
 * scrolls down never downloads either. Decorative: hidden from assistive
 * technology and from the pointer, so it never sits over a link's target.
 * Left out (by CSS, `.footer-globe` in globals.css) on a page that already
 * shows a globe, such as `/contact`.
 */
export function FooterGlobe({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} aria-hidden="true" className={`footer-globe pointer-events-none aspect-square ${className ?? ""}`}>
      {near ? (
        <GlobeWireframe
          enableInteraction={false}
          autoRotateSpeed={0.2}
          initialRotation={[-20, -25]}
          showGraticule
          graticuleOpacity={0.18}
          strokeWidth={0.7}
          sphereOutlineWidth={1.25}
        />
      ) : null}
    </div>
  );
}
