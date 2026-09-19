"use server";

import { revalidatePath } from "next/cache";

import { createGiftCodes } from "@/db/gift-codes";
import { requireOwner } from "@/lib/auth/require-owner";

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
  await requireOwner();

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

  // The list below the form is part of this page's answer, so it has to
  // show the codes that were just minted rather than the set it rendered
  // with.
  revalidatePath("/owner/gift-codes");

  return { codes };
}
