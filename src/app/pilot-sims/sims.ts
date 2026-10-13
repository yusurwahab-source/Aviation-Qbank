/**
 * The simulators under Pilot Sims. Static data, like `config/site.ts`: a
 * simulator is a self-contained page under `public/pilot-sims/`, not a row
 * in any content tree, so adding one is an entry here plus its file.
 */
export type PilotSim = {
  slug: string;
  name: string;
  description: string;
  /** The standalone page, served as-is from `public/`. */
  file: string;
  /** Display only for now — nothing gates a "premium" sim yet; flipping a
   * sim to premium needs an access check as well. */
  tier: "free" | "premium";
};

export const PILOT_SIMS: readonly PilotSim[] = [
  {
    slug: "holding-pattern-entry-trainer",
    name: "Holding Pattern Entry Trainer",
    description:
      "Drag the aircraft around the fix and read the entry — direct, teardrop or parallel — off the heading, or take a test from an ATC clearance and set the inbound course on the HSI yourself.",
    file: "/pilot-sims/holding-trainer.html",
    tier: "free",
  },
  {
    slug: "vor-ndb-trainer",
    name: "VOR/NDB Trainer",
    description:
      "Practice navigation using VOR and NDB signals. Interpret OBS settings, TO/FROM flags, and track courses using radio navigation aids.",
    file: "/pilot-sims/vor-ndb.html",
    tier: "free",
  },
  {
    slug: "heading-indicator",
    name: "Heading Indicator Trainer",
    description:
      "Practice reading aircraft heading on a directional gyro. Turn the heading selector and watch the compass card move beneath the fixed aircraft symbol.",
    file: "/pilot-sims/heading-indicator.html",
    tier: "free",
  },
];

export function findPilotSim(slug: string): PilotSim | undefined {
  return PILOT_SIMS.find((sim) => sim.slug === slug);
}
