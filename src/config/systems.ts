/**
 * How the B737's 15 sections are presented on the landing page and in the
 * "What's inside" grid: an icon, and whether the card carries a "Free"
 * badge.
 *
 * Keyed by `topic` exactly as it appears in the content files and the
 * database — there is no separate id for a section, so the topic string is
 * the join key, the same way `listTopics` already groups by it.
 *
 * `free` is a marketing flag, not a gate. The real free allowance
 * (`FREE_QUESTIONS_PER_AIRCRAFT` in `src/lib/billing/access-policy.ts`) is
 * counted per aircraft, not per section — answering any 20 questions on the
 * B737, from any mix of sections, is free. This only decides which cards
 * carry a "Free" badge to make that allowance feel concrete before a student
 * has picked anything. Three systems are marked, spanning enough of the
 * bank (167 of 802 questions) to be a real preview without making the rest
 * look withheld.
 */

export type SystemIconKey =
  | "general"
  | "air"
  | "anti-ice"
  | "autoflight"
  | "comms"
  | "electrical"
  | "engines"
  | "fire"
  | "controls"
  | "instruments"
  | "navigation"
  | "fuel"
  | "hydraulics"
  | "gear"
  | "warning";

export type SystemEntry = {
  icon: SystemIconKey;
  free: boolean;
};

export const B737_SYSTEMS: Record<string, SystemEntry> = {
  "Airplane General": { icon: "general", free: true },
  "Air Systems": { icon: "air", free: false },
  "Anti-Ice and Rain": { icon: "anti-ice", free: false },
  "Automatic Flight": { icon: "autoflight", free: false },
  Communications: { icon: "comms", free: false },
  Electrical: { icon: "electrical", free: true },
  "Engines and APU": { icon: "engines", free: false },
  "Fire Protection": { icon: "fire", free: false },
  "Flight Controls": { icon: "controls", free: false },
  "Flight Instruments and Displays": { icon: "instruments", free: false },
  "Flight Management and Navigation": { icon: "navigation", free: false },
  Fuel: { icon: "fuel", free: true },
  Hydraulics: { icon: "hydraulics", free: false },
  "Landing Gear and Brakes": { icon: "gear", free: false },
  "Warning Systems": { icon: "warning", free: false },
};

/** Falls back to a neutral icon and no badge for a topic this map does not
 * yet know about, so a new section never breaks the grid while content is
 * still being curated for it. */
export function systemEntry(topic: string): SystemEntry {
  return B737_SYSTEMS[topic] ?? { icon: "general", free: false };
}
