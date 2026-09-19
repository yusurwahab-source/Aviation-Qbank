import { z } from "zod";

import { emailSchema } from "@/lib/auth/credentials";

/**
 * What counts as an acceptable "which aircraft next?" submission.
 *
 * Pure, like `credentials.ts`, and reuses its `emailSchema` rather than
 * redefining what a valid email is a second time.
 */

export const aircraftNameSchema = z
  .string()
  .trim()
  .min(1, "Tell us which aircraft")
  .max(120, 'That\'s too long — just the type is enough, e.g. "A320"');

export const aircraftInterestSchema = z.object({
  email: emailSchema,
  aircraft: aircraftNameSchema,
});

export type AircraftInterestInput = z.infer<typeof aircraftInterestSchema>;
