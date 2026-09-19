"use server";

import { notFound } from "next/navigation";

import { createGiftCodes } from "@/db/gift-codes";
import { getCurrentUser } from "@/lib/auth/session";
import { isOwner } from "@/lib/auth/owner";
import { envValue } from "@/lib/env";

export type GenerateState = {
  error?: string;
  codes?: string[];
};

/**
 * Mints gift codes from the website, for an owner who would otherwise need
 * `npm run gift:generate` and a database connection to do this at all.
 *
 * Re-checks ownership itself rather than trusting that the page already
 * did — a server action is its own entry point, reachable directly, not
 * only through the form that happens to render it.
 */
export async function generate(
  _previous: GenerateState,
  formData: FormData,
): Promise<GenerateState> {
  const user = await getCurrentUser();
  if (!user || !isOwner(user.email, envValue("OWNER_EMAIL"))) notFound();

  const count = Number(formData.get("count"));
  const days = Number(formData.get("days"));
  const plan = formData.get("plan");
  const note = formData.get("note");

  if (!Number.isInteger(count) || count < 1 || count > 100) {
    return { error: "Count must be a whole number from 1 to 100." };
  }
  if (!Number.isInteger(days) || days < 1) {
    return { error: "Days must be a positive whole number." };
  }
  if (plan !== "monthly" && plan !== "quarterly") {
    return { error: "Choose a plan." };
  }

  const codes = await createGiftCodes({
    count,
    durationDays: days,
    plan,
    note: typeof note === "string" && note.trim() !== "" ? note.trim() : null,
  });

  return { codes };
}
