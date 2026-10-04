import { UpgradePromptDialog } from "@/components/upgrade-prompt-dialog";
import { getSiteSettings } from "@/db/settings";
import { getSubscription } from "@/db/subscriptions";
import { getCurrentUser } from "@/lib/auth/session";
import { hasActiveSubscription } from "@/lib/billing/access-policy";

/**
 * Decides whether the upgrade dialog may ever appear: only for a signed-in
 * student who does not already have access. Anyone else — signed out, a
 * subscriber, a gift-code holder — never has it rendered at all, so it is
 * not hidden from them, it is absent from the page.
 *
 * Wrapped like the header's own lookup: a prompt must never be what takes a
 * page down, so a database failure just means no prompt.
 */
export async function UpgradePrompt() {
  let freeQuestions: number | null = null;

  try {
    const user = await getCurrentUser();
    if (user) {
      const [subscription, settings] = await Promise.all([
        getSubscription(user.id),
        getSiteSettings(),
      ]);
      if (!subscription || !hasActiveSubscription(subscription)) {
        freeQuestions = settings.freeQuestionsPerAircraft;
      }
    }
  } catch {
    freeQuestions = null;
  }

  return freeQuestions === null ? null : <UpgradePromptDialog freeQuestions={freeQuestions} />;
}
