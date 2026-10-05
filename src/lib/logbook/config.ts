import "server-only";

import { envValue } from "@/lib/env";

/**
 * Logbook Scanner's two switches, both read from the environment.
 *
 * - `ANTHROPIC_API_KEY` set is what makes the tool available at all.
 * - `LOGBOOK_PURCHASES_ENABLED` is the feature flag for paying: off, an
 *   unlock comes only from a license code, the owner or a subscription; on,
 *   the €4.99 price is shown. No payment provider is connected yet — when
 *   one is, its confirmation calls `grantLogbookCredits` with source
 *   `purchase`, and this flag is what puts the button in front of people.
 */
export function logbookScannerConfigured(): boolean {
  return envValue("ANTHROPIC_API_KEY") !== null;
}

export function logbookPurchasesEnabled(): boolean {
  const value = envValue("LOGBOOK_PURCHASES_ENABLED");
  return value !== null && /^(1|true|yes|on)$/i.test(value);
}
