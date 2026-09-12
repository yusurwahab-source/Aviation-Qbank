import "server-only";

import { headers } from "next/headers";

/**
 * The caller's IP address, for rate limiting.
 *
 * Behind Vercel's proxy the real address is the first entry in
 * `x-forwarded-for`; everything after it is the chain of proxies. The header is
 * attacker-controlled in general, but Vercel overwrites it at the edge, so on
 * the deployed site the first entry can be trusted.
 *
 * Running locally there is no proxy and no header, so attempts all fall under
 * one bucket. That is correct for development and irrelevant in production.
 */
export async function getClientIp(): Promise<string> {
  const headerList = await headers();

  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 45); // longest possible IPv6 form
  }

  // Vercel also sets this one; useful as a fallback and on other hosts.
  const real = headerList.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 45);

  return "unknown";
}
