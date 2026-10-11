import { UpgradePromptDialog } from "@/components/upgrade-prompt-dialog";
import { getSiteSettings } from "@/db/settings";
import { getSubscription } from "@/db/subscriptions";
import { getCurrentUser } from "@/lib/auth/session";
import { FREE_MODE } from "@/config/free-mode";
import { hasFullAccess } from "@/lib/billing/access-policy";

/**
 * Decides whether the upgrade dialog may ever appear: for anyone who does
 * not already have access — signed out, or signed in without an active
 * subscription. A subscriber or a gift-code holder never has it rendered at
 * all, so it is not hidden from them, it is absent from the page.
 *
 * Wrapped like the header's own lookup: a prompt must never be what takes a
 * page down, so a database failure just means no prompt.
 */
export async function UpgradePrompt() {
  // Free mode: nobody needs upgrading, so the dialog is absent from the page.
  if (FREE_MODE) return null;

  let state: { freeQuestions: number; signedIn: boolean } | null = null;

  try {
    const [user, settings] = await Promise.all([getCurrentUser(), getSiteSettings()]);
    const subscription = user ? await getSubscription(user.id) : null;
    if (!subscription || !hasFullAccess(subscription)) {
      state = { freeQuestions: settings.freeQuestionsPerAircraft, signedIn: user !== null };
    }
  } catch {
    state = null;
  }

  return state === null ? null : <UpgradePromptDialog {...state} />;
}
