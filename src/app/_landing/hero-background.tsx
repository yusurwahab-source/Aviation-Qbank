/**
 * The hero's backdrop: a 737 planform climbing away, an oversized echo of
 * the logo's own compass bezel, and a horizon.
 *
 * Deliberately not a photo. This product has no aircraft photography to
 * license honestly, and a stock airliner shot would say nothing true about
 * it — so the aeroplane here is drawn from the same tokens as everything
 * else, an extension of the logo mark rather than a decoration bolted on
 * beside it. It is a planform because that is how a type is actually
 * identified: the wing sweep, the engine position and the tailplane are the
 * shape a pilot reads, and a three-quarter glamour view is the shape a
 * brochure reads.
 *
 * **Three layers placed by CSS, not one `slice`d viewBox.** That was the
 * first attempt and it does not survive a phone: a 800×600 box sliced into
 * a 375×1200 hero scales to the height and shows the middle fifth of the
 * width, so the aeroplane and the bezel both fell entirely outside the
 * crop and a visitor on a phone — most of them — saw an empty panel. Each
 * layer now carries a viewBox that just fits its own drawing, and Tailwind
 * decides where it sits and how big it is at each breakpoint. The cost is
 * three elements instead of one; the gain is that the composition is
 * designed at 375px rather than merely surviving there.
 *
 * Everything is absolutely positioned inside a `relative` ancestor of fixed
 * intent and never affects document flow, so none of it can shift anything
 * around it — nothing here should ever appear as layout shift in a
 * performance trace.
 */
export function HeroBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden text-accent-ink"
      role="presentation"
      aria-hidden="true"
    >
      {/* The bezel, echoing the logo mark at a much larger scale. Hung off
          the top-right corner so only its arc reads, the way an instrument
          bezel does at the edge of a panel. */}
      <svg
        viewBox="-250 -250 500 500"
        className="absolute -right-28 -top-36 h-[26rem] w-[26rem] sm:-right-20 sm:-top-32 sm:h-[34rem] sm:w-[34rem]"
        focusable="false"
      >
        <circle r="230" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.14" />
        <circle r="170" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.12" />

        {/* Heading-tape ticks around the rim, longer every 5th. */}
        {Array.from({ length: 36 }, (_, index) => {
          const angle = (index * 10 * Math.PI) / 180;
          const long = index % 5 === 0;
          const inner = long ? 210 : 220;
          return (
            <line
              key={index}
              x1={230 * Math.cos(angle)}
              y1={230 * Math.sin(angle)}
              x2={inner * Math.cos(angle)}
              y2={inner * Math.sin(angle)}
              stroke="currentColor"
              strokeWidth="1.5"
              opacity={long ? "0.22" : "0.12"}
            />
          );
        })}
      </svg>

      {/* The horizon: the one straight line in the composition, and the only
          layer that may stretch, which is what `preserveAspectRatio="none"`
          is for — a line has no proportions to lose.
          Hidden on a phone, where the hero is tall enough with the pillar
          cards stacked below that a horizon this high would land on top of
          the card row and read as a stray rule rather than a horizon. */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-[30%] hidden h-px w-full sm:block"
        focusable="false"
      >
        <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="2" opacity="0.1" />
      </svg>

      {/* The aeroplane, climbing away to the right, with its track behind it
          drawn the way a flight plan is: dashed, and going somewhere.
          Bleeding off the bottom-left on a phone so it reads as passing
          through rather than as a logo dropped in a corner — and kept to the
          headline's half of the panel, clear of the pillar cards below. */}
      <svg
        viewBox="-210 -210 420 420"
        className="absolute -bottom-10 -left-20 h-64 w-64 sm:-left-8 sm:bottom-2 sm:h-80 sm:w-80 lg:left-2 lg:h-96 lg:w-96"
        focusable="false"
      >
        <g transform="rotate(-28)">
          <path
            d="M-196 178 C -132 120 -86 74 -34 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="7 11"
            strokeLinecap="round"
            opacity="0.16"
          />

          <g opacity="0.12">
            {/* Fuselage: nose cone, constant section, tapered tail. */}
            <path
              d="M0 -150 C 7 -140 11 -120 11 -96 L 11 74 L 8 126 L -8 126 L -11 74 L -11 -96 C -11 -120 -7 -140 0 -150 Z"
              fill="currentColor"
            />

            {/* Wings, swept back from a root just aft of mid-fuselage. */}
            <path d="M9 -18 L 128 66 L 133 82 L 116 82 L 9 40 Z" fill="currentColor" />
            <path d="M-9 -18 L -128 66 L -133 82 L -116 82 L -9 40 Z" fill="currentColor" />

            {/* Engines, slung forward of and below the wing, as on a 737. */}
            <path d="M44 4 L 66 20 L 60 46 L 38 30 Z" fill="currentColor" />
            <path d="M-44 4 L -66 20 L -60 46 L -38 30 Z" fill="currentColor" />

            {/* Tailplane. */}
            <path d="M8 84 L 54 114 L 56 124 L 46 124 L 8 106 Z" fill="currentColor" />
            <path d="M-8 84 L -54 114 L -56 124 L -46 124 L -8 106 Z" fill="currentColor" />
          </g>
        </g>
      </svg>
    </div>
  );
}
