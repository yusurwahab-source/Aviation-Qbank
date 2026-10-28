"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useReducedMotion } from "motion/react";
import { geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { mesh } from "topojson-client";
import type { MultiLineString } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";

import { cn } from "@/lib/utils";

/*
 * A wireframe globe in `currentColor`, from ScrollX UI's "Contact with
 * globe", rewritten for this app: `d3-geo` alone (not all of d3), four fixed
 * <path>s whose `d` is set from a requestAnimationFrame loop — no React
 * render and no DOM rebuild per frame — and country outlines as one
 * `topojson.mesh`, so each border is stroked once. The map is `world-atlas`
 * as a lazy chunk served from this site, never a CDN. It spins only while on
 * screen, not at all under reduced motion; drag works with mouse, pen and
 * touch, and a vertical swipe still scrolls the page.
 *
 * Used by `/contact` (contact-with-globe.tsx) and the site footer
 * (components/footer-globe.tsx).
 */

/** The SVG's own coordinate box; CSS scales it to whatever width it gets. */
const SIZE = 400;
const RADIUS = SIZE / 2 - 2;

interface WorldTopology extends Topology {
  objects: { countries: GeometryCollection };
}

interface GlobeWireframeProps {
  className?: string;
  /** Degrees of longitude per 60th of a second. */
  autoRotateSpeed?: number;
  /** Starting [longitude, latitude] rotation. */
  initialRotation?: [number, number];
  strokeWidth?: number;
  sphereOutlineWidth?: number;
  showGraticule?: boolean;
  graticuleOpacity?: number;
  enableInteraction?: boolean;
}

export function GlobeWireframe({
  className,
  autoRotateSpeed = 0.45,
  initialRotation = [-10, -20],
  strokeWidth = 0.6,
  sphereOutlineWidth = 1.5,
  showGraticule = false,
  graticuleOpacity = 0.15,
  enableInteraction = true,
}: GlobeWireframeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const bordersRef = useRef<SVGPathElement>(null);
  const graticuleRef = useRef<SVGPathElement>(null);
  const rotation = useRef<[number, number]>(initialRotation);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const draw = useRef<() => void>(() => {});
  const [borders, setBorders] = useState<MultiLineString | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    import("world-atlas/countries-110m.json")
      .then((module) => {
        const world = (module.default ?? module) as unknown as WorldTopology;
        if (!cancelled) setBorders(mesh(world, world.objects.countries));
      })
      // Decorative: without the map the globe is still a sphere.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const projection = geoOrthographic()
      .scale(RADIUS)
      .translate([SIZE / 2, SIZE / 2])
      .precision(0.5);
    const path = geoPath(projection);
    const graticule = geoGraticule10();

    draw.current = () => {
      projection.rotate(rotation.current);
      graticuleRef.current?.setAttribute("d", path(graticule) ?? "");
      if (borders) bordersRef.current?.setAttribute("d", path(borders) ?? "");
    };
    draw.current();

    if (reducedMotion || autoRotateSpeed === 0) return;

    let frame = 0;
    let last = 0;
    const tick = (time: number) => {
      // Scale by elapsed time so a slow device turns at the same speed.
      const elapsed = last ? Math.min(time - last, 100) : 1000 / 60;
      last = time;
      if (!drag.current) {
        const [lon, lat] = rotation.current;
        rotation.current = [(lon + (autoRotateSpeed * elapsed * 60) / 1000) % 360, lat];
        draw.current();
      }
      frame = requestAnimationFrame(tick);
    };
    const start = () => {
      if (frame) return;
      last = 0;
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };

    // Spin only while on screen.
    const observer = new IntersectionObserver(([entry]) =>
      entry.isIntersecting ? start() : stop(),
    );
    observer.observe(svg);
    return () => {
      observer.disconnect();
      stop();
    };
  }, [borders, reducedMotion, autoRotateSpeed]);

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (!enableInteraction) return;
    drag.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const from = drag.current;
    const svg = svgRef.current;
    if (!from || !svg) return;
    // Degrees per screen pixel, so a drag feels the same at any size.
    const sensitivity = (180 / svg.getBoundingClientRect().width) * 0.8;
    const [lon, lat] = rotation.current;
    rotation.current = [
      lon + (event.clientX - from.x) * sensitivity,
      Math.max(-90, Math.min(90, lat - (event.clientY - from.y) * sensitivity)),
    ];
    drag.current = { x: event.clientX, y: event.clientY };
    draw.current();
  };

  const endDrag = () => {
    drag.current = null;
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      aria-hidden="true"
      focusable="false"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={cn(
        "block aspect-square w-full select-none",
        enableInteraction && "cursor-grab active:cursor-grabbing",
        className,
      )}
      style={{ touchAction: "pan-y" }}
      fill="none"
      stroke="currentColor"
    >
      {showGraticule ? (
        <path
          ref={graticuleRef}
          strokeWidth={1}
          opacity={graticuleOpacity}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
      <path
        ref={bordersRef}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {/* An orthographic globe's outline is always this circle. */}
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        strokeWidth={sphereOutlineWidth}
        opacity={0.8}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default GlobeWireframe;
