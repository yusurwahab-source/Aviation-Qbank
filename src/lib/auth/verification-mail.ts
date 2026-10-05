import "server-only";

import { issueVerificationToken } from "@/db/email-verification";
import { appUrl, sendEmail } from "@/lib/email/send";
import { verificationEmail } from "@/lib/email/verification-email";

/**
 * Issues a fresh verification link for an account and mails it. Never throws:
 * a sign-up must succeed, and a resend must answer the same way, whether or
 * not the mail provider is having a bad day.
 */
export async function sendVerificationEmail(userId: string, email: string): Promise<void> {
  try {
    const token = await issueVerificationToken(userId);
    const link = `${appUrl()}/verify-email?token=${encodeURIComponent(token)}`;
    await sendEmail(verificationEmail(email, link));
  } catch (error) {
    console.error("Verification email failed:", error);
  }
}
