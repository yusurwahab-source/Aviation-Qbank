import type { ReactNode } from "react";

import type { SystemIconKey } from "@/config/systems";

/**
 * One small glyph per B737 section, for the "What's inside" grid.
 *
 * Drawn the same way `Logo` is: plain geometry in `currentColor`, no second
 * asset per theme and no icon library — fifteen of these would be a strange
 * reason to add a dependency. Each is built from a handful of lines, arcs
 * and simple shapes rather than traced artwork, in keeping with "no stock
 * photography, geometric only" for this page.
 */

const STROKE = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function Icon({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg {...STROKE} className={className} role="img" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

const ICONS: Record<SystemIconKey, ReactNode> = {
  // Top-down airframe: fuselage, main wing, tailplane.
  general: (
    <>
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="3" y1="13" x2="21" y2="13" />
      <line x1="8" y1="19" x2="16" y2="19" />
    </>
  ),
  // Three rows of airflow.
  air: (
    <>
      <path d="M4 7.5c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0" />
      <path d="M4 12.5c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0" />
      <path d="M4 17.5c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0" />
    </>
  ),
  // Snowflake: three crossing spokes.
  "anti-ice": (
    <>
      <line x1="12" y1="4" x2="12" y2="20" />
      <line x1="5" y1="8" x2="19" y2="16" />
      <line x1="19" y1="8" x2="5" y2="16" />
    </>
  ),
  // Flight-director wing cue: a horizon bar on a bank ring.
  autoflight: (
    <>
      <circle cx="12" cy="12" r="7" />
      <line x1="5" y1="12" x2="19" y2="12" />
      <line x1="5" y1="12" x2="3.3" y2="10" />
      <line x1="19" y1="12" x2="20.7" y2="10" />
    </>
  ),
  // Antenna with two broadcast arcs.
  comms: (
    <>
      <circle cx="12" cy="8" r="1.4" fill="currentColor" stroke="none" />
      <line x1="12" y1="9.4" x2="12" y2="20" />
      <path d="M8 11a6 6 0 0 1 0-6" />
      <path d="M16 11a6 6 0 0 0 0-6" />
    </>
  ),
  // A filled bolt reads better than an outlined one at this size.
  electrical: <path d="M14 2 7 13h5l-2 9 7-11h-5l2-9Z" fill="currentColor" stroke="none" />,
  // Hub with four curved blades, each the same path rotated 90°.
  engines: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      {[0, 90, 180, 270].map((deg) => (
        <path key={deg} d="M12 12 Q16.5 10 18 12" transform={`rotate(${deg} 12 12)`} />
      ))}
    </>
  ),
  fire: (
    <path
      d="M12 2c-2 3-6 6-6 11a6 6 0 0 0 12 0c0-2.5-1.5-4-2.5-5 .3 2.2-1 3-1.8 2.2 1-2.8-.5-5.5-1.7-8.2Z"
      fill="currentColor"
      stroke="none"
    />
  ),
  // Control wheel on a column.
  controls: (
    <>
      <circle cx="12" cy="10" r="6" />
      <line x1="6" y1="10" x2="18" y2="10" />
      <line x1="12" y1="10" x2="12" y2="21" />
      <line x1="9" y1="21" x2="15" y2="21" />
    </>
  ),
  // A dial with a needle and rim ticks.
  instruments: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <line x1="12" y1="12" x2="16" y2="7.5" />
      <line x1="12" y1="4" x2="12" y2="6" />
      <line x1="4" y1="12" x2="6" y2="12" />
      <line x1="20" y1="12" x2="18" y2="12" />
    </>
  ),
  // A compass rose with a filled needle.
  navigation: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 5 14.5 12 12 19 9.5 12Z" fill="currentColor" stroke="none" />
    </>
  ),
  // A single droplet.
  fuel: <path d="M12 3c3 5 6 8.2 6 12a6 6 0 0 1-12 0c0-3.8 3-7 6-12Z" />,
  // Actuator: a cylinder with a rod.
  hydraulics: (
    <>
      <rect x="5" y="9" width="8" height="6" rx="1" />
      <line x1="13" y1="12" x2="20" y2="12" />
      <line x1="19" y1="9.5" x2="19" y2="14.5" />
    </>
  ),
  // A wheel on a short strut.
  gear: (
    <>
      <line x1="12" y1="3" x2="12" y2="6" />
      <circle cx="12" cy="14" r="7" />
      <circle cx="12" cy="14" r="1.6" fill="currentColor" stroke="none" />
      <line x1="12" y1="7" x2="12" y2="10" />
      <line x1="12" y1="18" x2="12" y2="21" />
      <line x1="5" y1="14" x2="8" y2="14" />
      <line x1="16" y1="14" x2="19" y2="14" />
    </>
  ),
  // A warning triangle with an exclamation mark.
  warning: (
    <>
      <path d="M12 3 21 20H3Z" />
      <line x1="12" y1="9" x2="12" y2="15" />
      <circle cx="12" cy="17.5" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
};

export function SystemIcon({
  icon,
  className = "h-6 w-6",
}: {
  icon: SystemIconKey;
  className?: string;
}) {
  return <Icon className={className}>{ICONS[icon]}</Icon>;
}
