/**
 * The hero's backdrop: an oversized echo of the logo's own compass bezel,
 * plus heading-tape ticks, drawn in the accent colour at low opacity.
 *
 * Deliberately not a photo. This product has no aircraft photography to
 * license honestly, and a stock airliner shot would say nothing true about
 * it — the brief for this page is geometry built from the same tokens as
 * everything else, so it is an extension of the logo mark rather than a
 * decoration bolted on beside it.
 *
 * Absolutely positioned within a `relative` ancestor of fixed intent, never
 * affecting document flow, so it cannot shift anything around it — nothing
 * here should ever appear as layout shift in a performance trace.
 */
export function HeroBackground() {
  return (
    <svg
      viewBox="0 0 800 600"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full text-accent"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      {/* The bezel, echoing the logo mark at a much larger scale. */}
      <circle cx="620" cy="180" r="230" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.14" />
      <circle cx="620" cy="180" r="170" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.12" />

      {/* Heading-tape ticks around the bezel's rim, longer every 5th. */}
      {Array.from({ length: 36 }, (_, index) => {
        const angle = (index * 10 * Math.PI) / 180;
        const long = index % 5 === 0;
        const outer = 230;
        const inner = long ? 210 : 220;
        const x1 = 620 + outer * Math.cos(angle);
        const y1 = 180 + outer * Math.sin(angle);
        const x2 = 620 + inner * Math.cos(angle);
        const y2 = 180 + inner * Math.sin(angle);
        return (
          <line
            key={index}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="currentColor"
            strokeWidth="1.5"
            opacity={long ? "0.22" : "0.12"}
          />
        );
      })}

      {/* A quiet horizon, the one straight line in the composition. */}
      <line x1="-40" y1="420" x2="840" y2="390" stroke="currentColor" strokeWidth="1" opacity="0.08" />
    </svg>
  );
}
