import { z } from "zod";

/**
 * Blog posts and Articles: the rules, with no database and no React.
 *
 * Pure and unit tested, the same split `settings.ts` and `grading.ts` keep:
 * the owner's editor form is untrusted input like any other, and this file
 * is the only way it becomes something the database will store.
 */

export const POST_KINDS = ["blog", "article"] as const;
export type PostKind = (typeof POST_KINDS)[number];
export type PostStatus = "draft" | "published";

export type PostReference = { title: string; url: string; publisher?: string; date?: string };

/** Where each kind lives on the public site. */
export const POST_KIND_PATH: Record<PostKind, "/blog" | "/articles"> = {
  blog: "/blog",
  article: "/articles",
};

export const POST_KIND_LABEL: Record<PostKind, { singular: string; plural: string }> = {
  blog: { singular: "Blog post", plural: "Blog" },
  article: { singular: "Article", plural: "Articles" },
};

/** Suggested categories offered in the editor; any short text is allowed. */
export const SUGGESTED_CATEGORIES: Record<PostKind, string[]> = {
  blog: ["Aviation news", "Industry", "PilotQBank news"],
  article: ["Theory", "Regulations", "Technical", "Study guidance"],
};

export function isPostKind(value: unknown): value is PostKind {
  return typeof value === "string" && (POST_KINDS as readonly string[]).includes(value);
}

export function postPath(kind: PostKind, slug: string): string {
  return `${POST_KIND_PATH[kind]}/${slug}`;
}

/**
 * A URL-safe slug from a title: lowercase ASCII letters, digits and single
 * hyphens. Accents are folded ("Météo" → "meteo"); anything else is dropped.
 */
export function slugify(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .replace(/-+$/g, "");
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Whether a link may be put on a public page: an absolute https:// URL with
 * a host. `http:`, `javascript:`, `data:` and anything relative are refused.
 */
export function isSafeHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.length > 0;
  } catch {
    return false;
  }
}

/** A cover image: https:// anywhere, or a path on this site ("/images/…"). */
export function isSafeImageSource(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return true;
  return isSafeHttpsUrl(value);
}

function isRealDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** "a, b ,, c" → ["a", "b", "c"], de-duplicated, order kept. */
export function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of raw.split(",")) {
    const tag = part.trim().replace(/\s+/g, " ");
    if (tag === "" || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    tags.push(tag);
  }
  return tags;
}

/**
 * One reference per line: `Title | https://url | Publisher | YYYY-MM-DD`.
 * Publisher and date are optional. Returns the references and, separately,
 * a message for every line that could not be read — nothing is dropped
 * silently, because a reference that quietly vanished is a citation the
 * reader was promised and never gets.
 */
export function parseReferences(raw: string): { references: PostReference[]; errors: string[] } {
  const references: PostReference[] = [];
  const errors: string[] = [];
  raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .forEach((line, index) => {
      const [title = "", url = "", publisher = "", date = ""] = line.split("|").map((part) => part.trim());
      const n = index + 1;
      if (title === "") return void errors.push(`Reference ${n}: the title is missing.`);
      if (!isSafeHttpsUrl(url)) return void errors.push(`Reference ${n}: the link must start with https://.`);
      if (date !== "" && !isRealDate(date)) return void errors.push(`Reference ${n}: the date must be YYYY-MM-DD.`);
      references.push({
        title: title.slice(0, 200),
        url,
        ...(publisher !== "" ? { publisher: publisher.slice(0, 120) } : {}),
        ...(date !== "" ? { date } : {}),
      });
    });
  return { references, errors };
}

/** The references back into the editor's one-per-line text. */
export function formatReferences(references: PostReference[]): string {
  return references
    .map((r) => [r.title, r.url, r.publisher ?? "", r.date ?? ""].join(" | ").replace(/(\s\|\s)+$/, ""))
    .join("\n");
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value));

const fieldsSchema = z.object({
  kind: z.enum(POST_KINDS),
  title: z.string().trim().min(1, "Write a title.").max(200, "Keep the title under 200 characters."),
  slug: z
    .string()
    .trim()
    .max(120, "Keep the address under 120 characters.")
    .refine((v) => v === "" || SLUG_PATTERN.test(v), "Use lowercase letters, numbers and hyphens only."),
  excerpt: z
    .string()
    .trim()
    .min(1, "Write a short description.")
    .max(320, "Keep the short description under 320 characters."),
  body: z.string().max(100_000, "The text is too long (100,000 characters at most)."),
  coverImageUrl: optionalText(2000).refine(
    (v) => v === null || isSafeImageSource(v),
    "The image link must start with https:// (or be a path on this site).",
  ),
  coverImageAlt: optionalText(200),
  category: optionalText(60),
  tags: z.string().max(400),
  references: z.string().max(10_000),
  sourceName: optionalText(120),
  sourceUrl: optionalText(2000).refine(
    (v) => v === null || isSafeHttpsUrl(v),
    "The source link must start with https://.",
  ),
  sourcePublishedOn: optionalText(10).refine(
    (v) => v === null || isRealDate(v),
    "The source date must be a real date.",
  ),
  publishedOn: optionalText(10).refine(
    (v) => v === null || isRealDate(v),
    "The publication date must be a real date.",
  ),
  featured: z.boolean(),
  seoTitle: optionalText(70),
  seoDescription: optionalText(170),
});

export type PostInput = {
  kind: PostKind;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  category: string | null;
  tags: string[];
  references: PostReference[];
  sourceName: string | null;
  sourceUrl: string | null;
  sourcePublishedOn: string | null;
  /** YYYY-MM-DD the owner chose, or null to use the moment of publishing. */
  publishedOn: string | null;
  featured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
};

export type RawPostFields = Record<keyof Omit<PostInput, "featured"> | "featured", unknown>;

/**
 * Validates the editor's fields. Returns the clean input or one message per
 * problem, in the order the fields appear on the form. A blank slug is
 * filled from the title. Publishing needs a body; a draft does not.
 */
export function validatePost(
  raw: RawPostFields,
  intent: "draft" | "publish",
): { ok: true; input: PostInput } | { ok: false; errors: string[] } {
  const asText = (value: unknown) => (typeof value === "string" ? value : "");
  const parsed = fieldsSchema.safeParse({
    kind: raw.kind,
    title: asText(raw.title),
    slug: asText(raw.slug),
    excerpt: asText(raw.excerpt),
    body: asText(raw.body),
    coverImageUrl: asText(raw.coverImageUrl),
    coverImageAlt: asText(raw.coverImageAlt),
    category: asText(raw.category),
    tags: asText(raw.tags),
    references: asText(raw.references),
    sourceName: asText(raw.sourceName),
    sourceUrl: asText(raw.sourceUrl),
    sourcePublishedOn: asText(raw.sourcePublishedOn),
    publishedOn: asText(raw.publishedOn),
    featured: raw.featured === true || raw.featured === "on" || raw.featured === "true",
    seoTitle: asText(raw.seoTitle),
    seoDescription: asText(raw.seoDescription),
  });

  const errors: string[] = parsed.success ? [] : parsed.error.issues.map((issue) => issue.message);
  if (!parsed.success) return { ok: false, errors };

  const fields = parsed.data;
  const slug = fields.slug !== "" ? fields.slug : slugify(fields.title);
  if (slug === "") errors.push("Add an address (slug): the title has no letters or numbers to make one from.");

  const tags = parseTags(fields.tags);
  if (tags.length > 10) errors.push("Use at most 10 tags.");
  if (tags.some((tag) => tag.length > 30)) errors.push("Keep each tag under 30 characters.");

  const { references, errors: referenceErrors } = parseReferences(fields.references);
  errors.push(...referenceErrors);
  if (references.length > 30) errors.push("Use at most 30 references.");

  if (fields.coverImageUrl !== null && fields.coverImageAlt === null) {
    errors.push("Describe the cover image (alt text) for readers who cannot see it.");
  }
  if (intent === "publish" && fields.body.trim() === "") errors.push("Write the text before publishing.");

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    input: {
      kind: fields.kind,
      title: fields.title,
      slug,
      excerpt: fields.excerpt,
      body: fields.body,
      coverImageUrl: fields.coverImageUrl,
      coverImageAlt: fields.coverImageUrl === null ? null : fields.coverImageAlt,
      category: fields.category,
      tags,
      references,
      sourceName: fields.sourceName,
      sourceUrl: fields.sourceUrl,
      sourcePublishedOn: fields.sourcePublishedOn,
      publishedOn: fields.publishedOn,
      featured: fields.featured,
      seoTitle: fields.seoTitle,
      seoDescription: fields.seoDescription,
    },
  };
}

/**
 * The `published_at` to store when a post is published: the owner's chosen
 * day (midnight UTC), else the post's existing date, else now.
 */
export function resolvePublishedAt(
  publishedOn: string | null,
  existing: Date | null,
  now: Date,
): Date {
  if (publishedOn !== null) return new Date(`${publishedOn}T00:00:00Z`);
  return existing ?? now;
}

/** Whether a post may be shown to the public right now. */
export function isPubliclyVisible(
  post: { status: PostStatus; publishedAt: Date | null },
  now: Date,
): boolean {
  return post.status === "published" && post.publishedAt !== null && post.publishedAt <= now;
}

/** "25 October 2026", in English, in UTC, for every reader alike. */
export function formatPostDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** Rough reading time at 220 words a minute, never less than one. */
export function readingMinutes(body: string): number {
  const words = body.trim() === "" ? 0 : body.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

/**
 * The URL rule for links and images inside a post's Markdown: https, mailto,
 * a path on this site or an in-page anchor. Anything else (http:,
 * javascript:, data:, protocol-relative) becomes an empty href, so it
 * renders as plain text rather than a live link.
 */
export function safeMarkdownUrl(url: string): string {
  const value = url.trim();
  if (value.startsWith("#")) return value;
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return value;
  if (/^mailto:[^\s]+$/i.test(value)) return value;
  return isSafeHttpsUrl(value) ? value : "";
}

/** Whether a link leaves this site (and so opens in a new tab with noopener). */
export function isExternalUrl(url: string): boolean {
  return /^https:\/\//i.test(url);
}
