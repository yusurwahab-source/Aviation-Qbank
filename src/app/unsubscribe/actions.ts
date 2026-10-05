"use server";

import { optOutWithToken } from "@/db/unsubscribe";

export type UnsubscribeState = { done?: boolean; error?: string };

/** Opts the account behind this email's token out of broadcasts. A POST, not
 * the page load, so a scanner opening the link does not unsubscribe anyone. */
export async function confirmUnsubscribe(
  _previous: UnsubscribeState,
  formData: FormData,
): Promise<UnsubscribeState> {
  const ok = await optOutWithToken(String(formData.get("token") ?? ""));
  return ok ? { done: true } : { error: "That link is not valid." };
}
