"use server";

import { recordAircraftInterest } from "@/db/aircraft-interest";
import { aircraftInterestSchema } from "@/lib/aircraft-interest";

/** The landing page's one server action: "Which aircraft next?". */

export type AircraftInterestState = {
  done?: boolean;
  error?: string;
  fieldErrors?: { email?: string; aircraft?: string };
};

export async function submitAircraftInterest(
  _previous: AircraftInterestState,
  formData: FormData,
): Promise<AircraftInterestState> {
  const email = String(formData.get("email") ?? "");
  const aircraft = String(formData.get("aircraft") ?? "");

  const parsed = aircraftInterestSchema.safeParse({ email, aircraft });
  if (!parsed.success) {
    const fieldErrors: AircraftInterestState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field === "email" && !fieldErrors.email) fieldErrors.email = issue.message;
      if (field === "aircraft" && !fieldErrors.aircraft) fieldErrors.aircraft = issue.message;
    }
    return { fieldErrors };
  }

  try {
    await recordAircraftInterest(parsed.data.email, parsed.data.aircraft);
  } catch (error) {
    console.error("Could not record aircraft interest:", error);
    return { error: "Could not save that just now. Please try again in a moment." };
  }

  return { done: true };
}
