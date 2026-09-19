import "server-only";

import { getDb } from "@/db";
import { aircraftInterest } from "@/db/schema";

/**
 * "Which aircraft next?" submissions from the landing page.
 *
 * A write-only table as far as the application is concerned — nothing here
 * reads it back to a browser. The owner reads it directly (`npm run
 * db:studio`) to decide what to build next.
 */
export async function recordAircraftInterest(email: string, aircraft: string): Promise<void> {
  await getDb().insert(aircraftInterest).values({ email, aircraft });
}
