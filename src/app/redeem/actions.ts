"use server";

import { redirect } from "next/navigation";

import { redeemGiftCode } from "@/db/gift-codes";
import { getCurrentUser } from "@/lib/auth/session";

export type RedeemState = { error?: string };

const REASON_MESSAGE = {
  not_found: "That code isn't valid. Check it and try again.",
  already_redeemed: "That code has already been used.",
} as const;

/**
 * Spends a gift code and grants the signed-in student full access.
 *
 * Unlike `startCheckout`, this never touches Stripe: `redeemGiftCode` writes
 * straight to the same `subscriptions` row the webhook otherwise keeps
 * current, through the `provider: "gift"` path that column exists for — see
 * the note on it in `schema.ts`.
 */
export async function redeem(_previous: RedeemState, formData: FormData): Promise<RedeemState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const code = formData.get("code");
  if (typeof code !== "string" || code.trim() === "") {
    return { error: "Enter a code." };
  }

  const result = await redeemGiftCode({ code, userId: user.id });
  if (!result.ok) return { error: REASON_MESSAGE[result.reason] };

  redirect("/upgrade?redeemed=1");
}
