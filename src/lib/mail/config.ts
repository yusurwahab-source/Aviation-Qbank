import { envValue } from "@/lib/env";

/**
 * Whether mail can arrive, and the address it arrives at.
 *
 * Both halves have to be present: the signing secret for the provider's
 * webhook (without it the endpoint refuses everything) and the address that
 * replies should come back to. Until then the owner's mail goes out from the
 * normal sender with the owner's own address as reply-to, so nobody is told to
 * write to an address nothing is listening on.
 */
export function inboundAddress(): string | null {
  return envValue("SUPPORT_EMAIL") ?? null;
}

export function inboundIsConfigured(): boolean {
  return Boolean(envValue("RESEND_WEBHOOK_SECRET") && inboundAddress());
}
