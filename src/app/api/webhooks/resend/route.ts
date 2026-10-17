import "server-only";

import { insertInbound } from "@/db/mailbox";
import { envValue } from "@/lib/env";
import { parseAddress, receivedEventSchema, storedBody } from "@/lib/mail/parse";
import { verifySvixSignature } from "@/lib/mail/svix";

/**
 * Where the mail provider tells this app that mail arrived.
 *
 * Held to the same standard as the Stripe webhook beside it: nothing in the
 * body is looked at until the signature has been checked against this
 * endpoint's own secret. Everything after that treats the message as what it
 * is — text from a stranger — and keeps only text.
 *
 * The webhook carries metadata, not the body, so the body is fetched by id
 * with the same API key the app sends mail with. If that fetch is refused
 * (a key allowed to send but not to read) the message is still stored with
 * its subject and sender and a line saying the body could not be read, which
 * is better than losing the fact that somebody wrote.
 */
export async function POST(request: Request): Promise<Response> {
  const secret = envValue("RESEND_WEBHOOK_SECRET");
  if (!secret) {
    console.error("Received a mail webhook but RESEND_WEBHOOK_SECRET is not set.");
    return new Response("Not configured", { status: 500 });
  }

  const rawBody = await request.text();
  const verification = verifySvixSignature({
    id: request.headers.get("svix-id"),
    timestamp: request.headers.get("svix-timestamp"),
    signature: request.headers.get("svix-signature"),
    body: rawBody,
    secret,
  });
  if (!verification.valid) {
    console.warn(`Mail webhook signature check failed: ${verification.reason}`);
    return new Response("Invalid signature", { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return new Response("OK", { status: 200 });
  }

  const event = receivedEventSchema.safeParse(json);
  // Other event types are not this endpoint's business; acknowledged so the
  // provider does not retry them.
  if (!event.success || event.data.type !== "email.received") return new Response("OK", { status: 200 });

  const { data } = event.data;
  const fetched = await fetchReceived(data.email_id);
  const from = parseAddress(fetched?.from ?? data.from ?? "unknown");

  try {
    await insertInbound({
      source: "resend",
      fromAddress: from.address.slice(0, 254),
      fromName: from.name?.slice(0, 120) ?? null,
      toAddress: (data.to?.[0] ?? "").slice(0, 254),
      subject: (fetched?.subject ?? data.subject ?? "(no subject)").slice(0, 300),
      textBody: fetched
        ? storedBody(fetched.text, fetched.html)
        : "(The body could not be read from the mail provider. Open the message there.)",
      replyTo: null,
      providerId: data.email_id,
      inReplyToId: null,
    });
  } catch (error) {
    console.error("Storing a received email failed:", error);
    // A 500 makes the provider retry, which is what we want for a database blip.
    return new Response("Storage failed", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}

async function fetchReceived(
  id: string,
): Promise<{ from?: string; subject?: string; text?: string | null; html?: string | null } | null> {
  try {
    const response = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${envValue("RESEND_API_KEY")}` },
    });
    if (!response.ok) {
      console.error(`Fetching a received email failed: ${response.status}`);
      return null;
    }
    return (await response.json()) as { from?: string; subject?: string; text?: string | null; html?: string | null };
  } catch (error) {
    console.error("Fetching a received email threw:", error);
    return null;
  }
}
