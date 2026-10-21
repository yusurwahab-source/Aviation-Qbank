import {
  clampCaption,
  promoCaption,
  promoForDate,
  questionCaption,
  tipCaption,
  type CardQuestion,
  type PostKind,
} from "@/lib/instagram/plan";
import { signCard, type CardKind } from "@/lib/instagram/signature";

/**
 * Turns "what kind of post, from what" into the exact thing to publish: the
 * caption and the signed image URLs. Pure — the origin and the secret are
 * arguments — so a dry run and a real run build byte-identical posts.
 */
export type ComposedPost = {
  kind: PostKind;
  contentRef: string;
  caption: string;
  imageUrls: string[];
};

type ComposeInput = {
  kind: PostKind;
  date: Date;
  /** Required for `question` and `tip`. */
  question: (CardQuestion & { subjectCode: string }) | null;
  origin: string;
  secret: string;
};

export function cardUrl(origin: string, secret: string, kind: CardKind, id: string): string {
  const query = new URLSearchParams({ kind, id, sig: signCard(secret, kind, id) });
  return `${origin}/api/instagram/card?${query}`;
}

export function composePost(input: ComposeInput): ComposedPost | null {
  const { kind, origin, secret } = input;
  const site = origin.replace(/^https?:\/\//, "");

  if (kind === "promo") {
    const promo = promoForDate(input.date);
    return {
      kind,
      contentRef: promo.key,
      caption: clampCaption(promoCaption(promo, site)),
      imageUrls: [cardUrl(origin, secret, "promo", promo.key)],
    };
  }

  const q = input.question;
  if (!q) return null;

  if (kind === "question") {
    return {
      kind,
      contentRef: q.id,
      caption: clampCaption(questionCaption(q, q.subjectCode, site)),
      imageUrls: [cardUrl(origin, secret, "question", q.id), cardUrl(origin, secret, "answer", q.id)],
    };
  }

  return {
    kind,
    contentRef: q.id,
    caption: clampCaption(tipCaption(q, q.subjectCode, site)),
    imageUrls: [cardUrl(origin, secret, "tip", q.id)],
  };
}
