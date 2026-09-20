"use server";

import { redirect } from "next/navigation";

import {
  checkRedeemAllowed,
  clearFailedRedeems,
  recordFailedRedeem,
} from "@/db/login-attempts";
import { redeemGiftCode } from "@/db/gift-codes";
import { getClientIp } from "@/lib/auth/client-ip";
import { getCurrentUser } from "@/lib/auth/session";
import { describeWait } from "@/lib/auth/rate-limit-policy";

export type RedeemState = { error?: string };

const REASON_MESSAGE = {
  not_found: "That code isn't valid. Check it and try again.",
  already_redeemed: "You have already redeemed that code.",
  disabled: "That code is no longer active.",
  expired: "That code has expired.",
  exhausted: "That code has already been fully redeemed.",
} as const;

/**
 * Spends a gift code and grants the signed-in student full access.
 *
 * Unlike `startCheckout`, this never touches Stripe: `redeemGiftCode` writes
 * straight to the same `subscriptions` row the webhook otherwise keeps
 * current, through the `provider: "gift"` path that column exists for — see
 * the note on it in `schema.ts`.
 *
 * Rate limited the same way log in is, and checked before the code is even
 * looked up: a code is a claim inside a transaction with a row lock, and
 * that is real work a flood of guesses should never reach.
 */
export async function redeem(_previous: RedeemState, formData: FormData): Promise<RedeemState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const code = formData.get("code");
  if (typeof code !== "string" || code.trim() === "") {
    return { error: "Enter a code." };
  }

  const ip = await getClientIp();
  const allowed = await checkRedeemAllowed(ip, user.id);
  if (!allowed.allowed) {
    return { error: `Too many attempts. Try again ${describeWait(allowed.retryAfterMs)}.` };
  }

  const result = await redeemGiftCode({ code, userId: user.id });
  if (!result.ok) {
    await recordFailedRedeem(ip, user.id);
    return { error: REASON_MESSAGE[result.reason] };
  }

  await clearFailedRedeems(user.id);
  redirect("/upgrade?redeemed=1");
}
