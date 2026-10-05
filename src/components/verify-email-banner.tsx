import { VerifyEmailNotice } from "@/components/verify-email-notice";
import { getCurrentUser } from "@/lib/auth/session";

/** Renders the confirm-your-email line for a signed-in, unconfirmed student.
 * A failed lookup just means no banner; the shell never depends on it. */
export async function VerifyEmailBanner() {
  let show = false;
  try {
    const user = await getCurrentUser();
    show = user !== null && !user.emailVerified;
  } catch {
    show = false;
  }
  return show ? <VerifyEmailNotice /> : null;
}
