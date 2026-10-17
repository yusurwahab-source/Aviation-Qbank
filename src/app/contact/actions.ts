"use server";

import { checkContactAllowed, recordContactRequest } from "@/db/login-attempts";
import { getClientIp } from "@/lib/auth/client-ip";
import { describeWait } from "@/lib/auth/rate-limit-policy";
import { getCurrentUser } from "@/lib/auth/session";
import { contactEmail, contactSchema } from "@/lib/contact";
import { sendEmail } from "@/lib/email/send";
import { envValue } from "@/lib/env";

/**
 * Sending a message to the owner from the contact form.
 *
 * Three things keep this from becoming a way to fill an inbox: a hidden field
 * a person never sees and a script usually fills in, a rate limit counted on
 * both the sender's address and the source, and the fixed `from` address in
 * `sendEmail`, which is why the visitor's own address only ever travels as
 * `reply_to`.
 */

export type ContactFormState = {
  done?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<"name" | "email" | "topic" | "message" | "questionId", string>>;
  /** Kept so a failed submit does not wipe what the visitor typed. */
  values?: {
    name: string;
    email: string;
    topic: string;
    questionId: string;
    message: string;
  };
};

export async function sendContactMessage(
  _previous: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    topic: String(formData.get("topic") ?? ""),
    questionId: String(formData.get("questionId") ?? ""),
    message: String(formData.get("message") ?? ""),
  };

  // The honeypot. A real visitor never sees this field, so anything in it is
  // a script — told "sent" so it has nothing to learn from, and sent nothing.
  if (String(formData.get("website") ?? "").trim() !== "") {
    return { done: true };
  }

  const parsed = contactSchema.safeParse({
    ...values,
    questionId: values.questionId || undefined,
  });
  if (!parsed.success) {
    const fieldErrors: NonNullable<ContactFormState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof NonNullable<ContactFormState["fieldErrors"]>;
      if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return { fieldErrors, values };
  }

  const input = parsed.data;
  const ip = await getClientIp();

  const allowed = await checkContactAllowed(ip, input.email.toLowerCase());
  if (!allowed.allowed) {
    return {
      error: `Too many messages from here. Try again ${describeWait(allowed.retryAfterMs)}.`,
      values,
    };
  }

  // Counted before sending, like reset mail: the limit protects the inbox and
  // the provider's quota, so a failed send must not be free to repeat.
  await recordContactRequest(ip, input.email.toLowerCase());

  const owner = envValue("OWNER_EMAIL");
  if (!owner) {
    console.error("Contact form: OWNER_EMAIL is not set, so there is nowhere to send this.");
    return { error: "Messages cannot be delivered right now. Please try again later.", values };
  }

  const user = await getCurrentUser().catch(() => null);
  const outcome = await sendEmail(contactEmail(owner, input, { signedInAs: user?.email }));

  // Without a provider `sendEmail` only prints to the server log. That is the
  // point locally and a silent failure in production, where the visitor would
  // be told "sent" for a message nobody received.
  const printedToLog = outcome.via === "log" && process.env.NODE_ENV !== "production";
  if (!outcome.delivered && !printedToLog) {
    return {
      error: "We could not send your message. Please try again in a few minutes.",
      values,
    };
  }

  return { done: true };
}
