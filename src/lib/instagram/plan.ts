/**
 * What the Instagram agent posts, and when. Pure and unit tested: no database,
 * no network, no clock of its own — the date is passed in.
 *
 * The account posts once a day, and the day decides the kind, so the feed has
 * a rhythm a follower can learn rather than whatever was easiest to generate:
 * an interactive question, a revision card, an invitation to the site.
 *
 * **Only Flying Knowledge ever appears.** It is the one bank that is free in
 * full (see `CLAUDE.md`); putting a type rating or class rating question on a
 * public feed would hand out what a subscription pays for. That rule is the
 * reason nothing in this folder reads `questions` or `class_questions`.
 */

export type PostKind = "question" | "tip" | "promo";

/** Index 0 is Sunday, matching `Date#getUTCDay`. */
const WEEK: readonly PostKind[] = [
  "promo", // Sun
  "question", // Mon
  "tip", // Tue
  "question", // Wed
  "promo", // Thu
  "question", // Fri
  "tip", // Sat
];

export function kindForDate(date: Date): PostKind {
  return WEEK[date.getUTCDay()];
}

/** `2026-10-21` — the UTC day, which is what `instagram_posts` is unique on. */
export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export type CardQuestion = {
  id: string;
  subjectName: string;
  topic: string;
  question: string;
  options: { id: string; text: string }[];
  correct: string;
  explanation: string;
};

/** The longest a card can carry, found by drawing them, not by guessing. */
export const CARD_LIMITS = {
  question: 200,
  option: 100,
  total: 600,
  explanation: 340,
} as const;

/**
 * Whether a question fits a 1080×1350 card at a size a phone can read.
 * A question that does not is skipped, never shortened: a clipped option is a
 * different question.
 */
export function fitsCard(q: Pick<CardQuestion, "question" | "options" | "explanation">): boolean {
  if (q.options.length < 2 || q.options.length > 4) return false;
  if (q.question.length > CARD_LIMITS.question) return false;
  if (q.explanation.length > CARD_LIMITS.explanation) return false;
  if (q.options.some((option) => option.text.length > CARD_LIMITS.option)) return false;
  const total = q.question.length + q.options.reduce((sum, o) => sum + o.text.length, 0);
  return total <= CARD_LIMITS.total;
}

/** Type sizes for a card, shrinking as the text grows. Always legible, never clipped. */
export function questionTypeSizes(q: Pick<CardQuestion, "question" | "options">): {
  question: number;
  option: number;
} {
  const total = q.question.length + q.options.reduce((sum, o) => sum + o.text.length, 0);
  if (total <= 300) return { question: 50, option: 38 };
  if (total <= 450) return { question: 44, option: 34 };
  return { question: 38, option: 30 };
}

export type Promo = {
  key: string;
  headline: string;
  body: string;
  /** Path on the site the post points at, without the domain. */
  path: string;
};

/**
 * Written to say only what the product does today — the same rule
 * `config/pricing.ts` follows. No counts: a number here goes stale the day a
 * bank grows, and nothing would notice.
 */
export const PROMOS: readonly Promo[] = [
  {
    key: "atpl-free",
    headline: "ATPL theory, free in full",
    body: "Principles of Flight, Meteorology, Air Law, Navigation, Instruments and more. No subscription, no question cap.",
    path: "/atpl-ground-school",
  },
  {
    key: "know-the-aircraft",
    headline: "Know the aircraft, not the answer key",
    body: "Type rating and class rating questions are written so every wrong option is ruled out by understanding the system.",
    path: "/aircraft-systems",
  },
  {
    key: "pilot-sims",
    headline: "Practise holding entries in your browser",
    body: "The Holding Pattern Entry Trainer and the VOR/NDB trainer are free. Fly the entry, then see the correct one.",
    path: "/pilot-sims",
  },
  {
    key: "exam-mode",
    headline: "Sit it like the real thing",
    body: "Study mode explains every answer straight away. Exam mode gives you a minute a question and nothing until the end.",
    path: "/",
  },
  {
    key: "weak-systems",
    headline: "Find the topics costing you marks",
    body: "Every answer is recorded, so your weakest systems are one tap from a new test aimed at them.",
    path: "/progress",
  },
];

/** The same promo for the same day, a different one the next. */
export function promoForDate(date: Date): Promo {
  const days = Math.floor(date.getTime() / 86_400_000);
  return PROMOS[days % PROMOS.length];
}

const BASE_TAGS = ["#aviation", "#pilot", "#studentpilot", "#pilotlife", "#avgeek"];

const TOPIC_TAGS: Record<string, string[]> = {
  POF: ["#principlesofflight", "#aerodynamics"],
  MET: ["#aviationweather", "#meteorology"],
  HPL: ["#humanfactors", "#hpl"],
  LAW: ["#airlaw"],
  RNAV: ["#radionavigation"],
  INST: ["#instruments"],
  FPM: ["#flightplanning"],
  OPS: ["#operationalprocedures"],
  COM: ["#aviationenglish", "#radiocomms"],
  MB: ["#massandbalance"],
  PERF: ["#aircraftperformance"],
  AGK: ["#aircraftsystems"],
};

export function hashtags(subjectCode: string | null, extra: readonly string[] = []): string {
  const tags = [...(subjectCode ? (TOPIC_TAGS[subjectCode] ?? []) : []), ...extra, ...BASE_TAGS, "#atpl"];
  return [...new Set(tags)].slice(0, 12).join(" ");
}

const LETTERS = "ABCDE";

export function questionCaption(q: CardQuestion, subjectCode: string, site: string): string {
  return [
    `Question of the day · ${q.subjectName}`,
    "",
    q.question,
    "",
    ...q.options.map((option, i) => `${LETTERS[i]}) ${option.text}`),
    "",
    "Comment your answer, then swipe for the solution.",
    `More ${q.subjectName} questions, free: link in bio (${site})`,
    "",
    hashtags(subjectCode),
  ].join("\n");
}

export function tipCaption(q: CardQuestion, subjectCode: string, site: string): string {
  return [
    `Revise it: ${q.topic}`,
    "",
    q.explanation,
    "",
    `Test yourself on ${q.subjectName}, free: link in bio (${site})`,
    "",
    hashtags(subjectCode),
  ].join("\n");
}

export function promoCaption(promo: Promo, site: string): string {
  // A caption link is plain text on Instagram, not tappable: point at the bio.
  return [promo.headline, "", promo.body, "", `Link in bio · ${site}${promo.path === "/" ? "" : promo.path}`, "", hashtags(null)].join("\n");
}

/** Instagram refuses a caption over 2,200 characters or with more than 30 hashtags. */
export const MAX_CAPTION = 2200;

export function clampCaption(caption: string): string {
  if (caption.length <= MAX_CAPTION) return caption;
  return `${caption.slice(0, MAX_CAPTION - 1).trimEnd()}…`;
}
