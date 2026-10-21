import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Card URLs are signed, because the card route can draw an answer.
 *
 * Instagram fetches a post's image from a public URL, so the route cannot sit
 * behind a login. Without a signature, `/api/instagram/card` would be a way
 * to read any Flying Knowledge answer and explanation without sitting a test
 * — the exact thing `CLAUDE.md` says the answer key must never allow. The
 * agent signs every URL it hands to Instagram, with a key nobody else holds,
 * and the route refuses anything unsigned.
 */
export type CardKind = "question" | "answer" | "tip" | "promo";

export function signCard(secret: string, kind: CardKind, id: string): string {
  return createHmac("sha256", secret).update(`instagram-card:${kind}:${id}`).digest("hex");
}

export function verifyCard(secret: string, kind: CardKind, id: string, signature: string): boolean {
  const expected = Buffer.from(signCard(secret, kind, id));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function isCardKind(value: string | null): value is CardKind {
  return value === "question" || value === "answer" || value === "tip" || value === "promo";
}
