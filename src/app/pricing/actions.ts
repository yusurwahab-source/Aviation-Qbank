"use server";

import { recordEarlyAccessSignup } from "@/db/early-access";
import { earlyAccessSchema } from "@/lib/early-access";

/**
 * The /pricing buy buttons' one server action.
 *
 * Checkout is not wired up yet — see the note in `src/config/plans.ts` —
 * so every "Get started" button on that page opens this form instead of a
 * payment page. `/admin` is where these are read back.
 */

export type EarlyAccessState = {
  done?: boolean;
  error?: string;
  fieldErrors?: { email?: string; aircraft?: string };
};

export async function submitEarlyAccessSignup(
  _previous: EarlyAccessState,
  formData: FormData,
): Promise<EarlyAccessState> {
  const email = String(formData.get("email") ?? "");
  const aircraft = String(formData.get("aircraft") ?? "");
  const tier = String(formData.get("tier") ?? "");

  const parsed = earlyAccessSchema.safeParse({ email, aircraft, tier });
  if (!parsed.success) {
    const fieldErrors: EarlyAccessState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field === "email" && !fieldErrors.email) fieldErrors.email = issue.message;
      if (field === "aircraft" && !fieldErrors.aircraft) fieldErrors.aircraft = issue.message;
    }
    // An invalid `tier` means a tampered form, not something to show a
    // field error for — fall back to the first tier's id rather than
    // failing the whole submission over a hidden field the user never saw.
    if (Object.keys(fieldErrors).length === 0) {
      return { error: "That plan could not be recognised. Please try again." };
    }
    return { fieldErrors };
  }

  try {
    await recordEarlyAccessSignup(parsed.data.email, parsed.data.aircraft, parsed.data.tier);
  } catch (error) {
    console.error("Could not record an early access signup:", error);
    return { error: "Could not save that just now. Please try again in a moment." };
  }

  return { done: true };
}
