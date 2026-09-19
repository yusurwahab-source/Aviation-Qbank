"use server";

import { revalidatePath } from "next/cache";

import { grantAccess, revokeAccess } from "@/db/owner";
import { requireOwner } from "@/lib/auth/require-owner";

export type AccessState = {
  error?: string;
  message?: string;
  /** Set when the change was made but does not mean what it looks like —
   * see the Stripe note in `revokeAccess`. */
  warning?: string;
};

/**
 * Grants or revokes one account's access from the accounts list.
 *
 * One action for both because they are one decision made in one place: the
 * form carries an `intent` from whichever button was pressed. Ownership is
 * re-checked here rather than assumed from the page that rendered the form,
 * for the reason `generate` states — an action is its own entry point, and
 * this one writes to somebody else's subscription.
 */
export async function updateAccess(
  _previous: AccessState,
  formData: FormData,
): Promise<AccessState> {
  await requireOwner();

  const intent = formData.get("intent");
  const userId = formData.get("userId");

  if (typeof userId !== "string" || userId === "") {
    return { error: "No account was named." };
  }

  if (intent === "revoke") {
    const revoked = await revokeAccess(userId);
    if (!revoked) return { error: "That account has no subscription to revoke." };

    revalidatePath("/owner/accounts");

    return {
      message: `Access removed from ${revoked.email}.`,
      warning:
        revoked.provider === "stripe"
          ? "This was a Stripe subscription. It is still billing — cancel it in Stripe too, or the next renewal will turn access back on."
          : undefined,
    };
  }

  if (intent !== "grant") return { error: "Choose grant or revoke." };

  const days = Number(formData.get("days"));
  const plan = formData.get("plan");

  if (!Number.isInteger(days) || days < 1 || days > 3650) {
    return { error: "Days must be a whole number from 1 to 3650." };
  }
  if (plan !== "monthly" && plan !== "quarterly") {
    return { error: "Choose a plan." };
  }

  const granted = await grantAccess({ userId, plan, days });
  if (!granted) return { error: "That account no longer exists." };

  revalidatePath("/owner/accounts");

  return {
    message: `${granted.email} now has access until ${granted.periodEnd.toLocaleDateString(
      undefined,
      { day: "numeric", month: "short", year: "numeric" },
    )}.`,
  };
}
