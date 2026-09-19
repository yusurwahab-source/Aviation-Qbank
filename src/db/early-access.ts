import "server-only";

import { desc } from "drizzle-orm";

import { getDb } from "@/db";
import { earlyAccessSignups } from "@/db/schema";

/**
 * The /pricing "Join the early access list" capture — see the note on the
 * table in `schema.ts`. Write-only as far as most of the application is
 * concerned; `/admin` is the one reader.
 */

export async function recordEarlyAccessSignup(
  email: string,
  aircraft: string,
  tier: string,
): Promise<void> {
  await getDb().insert(earlyAccessSignups).values({ email, aircraft, tier });
}

export type EarlyAccessListing = {
  email: string;
  aircraft: string;
  tier: string;
  createdAt: Date;
};

export async function listEarlyAccessSignups(limit = 200): Promise<EarlyAccessListing[]> {
  return getDb()
    .select({
      email: earlyAccessSignups.email,
      aircraft: earlyAccessSignups.aircraft,
      tier: earlyAccessSignups.tier,
      createdAt: earlyAccessSignups.createdAt,
    })
    .from(earlyAccessSignups)
    .orderBy(desc(earlyAccessSignups.createdAt))
    .limit(limit);
}
