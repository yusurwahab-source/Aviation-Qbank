import { z } from "zod";

import { emailSchema } from "@/lib/auth/credentials";
import { aircraftNameSchema } from "@/lib/aircraft-interest";
import { PRICING_TIERS, type PricingTierId } from "@/config/plans";

/**
 * What counts as an acceptable "join the early access list" submission —
 * the /pricing buy button, since checkout is not live. Pure, like
 * `aircraft-interest.ts` beside it, and reuses its `aircraftNameSchema`:
 * "which aircraft do you need" is the same question in both places.
 */

const tierIds = PRICING_TIERS.map((tier) => tier.id) as [PricingTierId, ...PricingTierId[]];

export const earlyAccessSchema = z.object({
  email: emailSchema,
  aircraft: aircraftNameSchema,
  tier: z.enum(tierIds),
});

export type EarlyAccessInput = z.infer<typeof earlyAccessSchema>;
