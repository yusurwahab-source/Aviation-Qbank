import "server-only";

import { and, count, desc, eq, isNotNull, lte, sql, type SQL } from "drizzle-orm";

import { getDb } from "@/db";
import { posts, type Post } from "@/db/schema";
import { resolvePublishedAt, type PostInput, type PostKind, type PostStatus } from "@/lib/posts";

/**
 * Blog posts and Articles.
 *
 * Two halves, kept apart on purpose. The public half (`listPublished…`,
 * `getPublishedPost`, `listLatest…`, `listPostsForSitemap`) applies
 * `isVisible` in SQL — published, and dated now or earlier — so no public
 * page can be handed a draft or a scheduled post by any argument it passes.
 * The owner half (`listAllPosts`, `getPostById`, `savePost`,
 * `unpublishPost`) sees every row and is imported only by `/owner/content`,
 * behind `requireOwner()`, the same rule `db/owner.ts` states for itself.
 */

const isVisible = (): SQL =>
  and(eq(posts.status, "published"), isNotNull(posts.publishedAt), lte(posts.publishedAt, sql`now()`))!;

export type PostSummary = Pick<
  Post,
  "id" | "kind" | "slug" | "title" | "excerpt" | "coverImageUrl" | "coverImageAlt" | "category" | "publishedAt" | "featured"
>;

const summaryColumns = {
  id: posts.id,
  kind: posts.kind,
  slug: posts.slug,
  title: posts.title,
  excerpt: posts.excerpt,
  coverImageUrl: posts.coverImageUrl,
  coverImageAlt: posts.coverImageAlt,
  category: posts.category,
  publishedAt: posts.publishedAt,
  featured: posts.featured,
};

// ── Public ──────────────────────────────────────────────────────────────

export async function listPublishedPosts(
  kind: PostKind,
  options: { limit: number; offset: number; category?: string | null },
): Promise<{ rows: PostSummary[]; total: number }> {
  const where = and(
    eq(posts.kind, kind),
    isVisible(),
    options.category ? eq(posts.category, options.category) : undefined,
  );
  const db = getDb();
  const [rows, [{ total }]] = await Promise.all([
    db
      .select(summaryColumns)
      .from(posts)
      .where(where)
      .orderBy(desc(posts.publishedAt), desc(posts.createdAt))
      .limit(options.limit)
      .offset(options.offset),
    db.select({ total: count() }).from(posts).where(where),
  ]);
  return { rows, total };
}

export async function listPublishedCategories(kind: PostKind): Promise<string[]> {
  const rows = await getDb()
    .selectDistinct({ category: posts.category })
    .from(posts)
    .where(and(eq(posts.kind, kind), isVisible(), isNotNull(posts.category)))
    .orderBy(posts.category);
  return rows.map((row) => row.category).filter((c): c is string => c !== null);
}

export async function getPublishedPost(kind: PostKind, slug: string): Promise<Post | null> {
  const [row] = await getDb()
    .select()
    .from(posts)
    .where(and(eq(posts.kind, kind), eq(posts.slug, slug), isVisible()))
    .limit(1);
  return row ?? null;
}

/** Newest first, strictly by publication date — the homepage's Latest
 * Articles. `featured` no longer reorders it: the newest post is the one a
 * returning reader has not seen. */
export async function listLatestPosts(kind: PostKind, limit: number): Promise<PostSummary[]> {
  return getDb()
    .select(summaryColumns)
    .from(posts)
    .where(and(eq(posts.kind, kind), isVisible()))
    .orderBy(desc(posts.publishedAt), desc(posts.createdAt))
    .limit(limit);
}

export async function listPostsForSitemap(): Promise<
  { kind: PostKind; slug: string; updatedAt: Date }[]
> {
  return getDb()
    .select({ kind: posts.kind, slug: posts.slug, updatedAt: posts.updatedAt })
    .from(posts)
    .where(isVisible())
    .orderBy(desc(posts.publishedAt));
}

// ── Owner only ──────────────────────────────────────────────────────────

export type PostListing = PostSummary & { status: PostStatus; updatedAt: Date };

export async function listAllPosts(filter: {
  kind?: PostKind | null;
  status?: PostStatus | null;
}): Promise<PostListing[]> {
  return getDb()
    .select({ ...summaryColumns, status: posts.status, updatedAt: posts.updatedAt })
    .from(posts)
    .where(
      and(
        filter.kind ? eq(posts.kind, filter.kind) : undefined,
        filter.status ? eq(posts.status, filter.status) : undefined,
      ),
    )
    .orderBy(desc(posts.updatedAt))
    .limit(500);
}

export async function getPostById(id: string): Promise<Post | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await getDb().select().from(posts).where(eq(posts.id, id)).limit(1);
  return row ?? null;
}

export type SaveIntent = "draft" | "publish";

export type SaveResult =
  | { ok: true; id: string; kind: PostKind; slug: string; status: PostStatus; previousSlug: string | null; previousCoverImageUrl: string | null }
  | { ok: false; reason: "slug_taken" | "not_found" };

function isUniqueViolation(error: unknown): boolean {
  const code = (error as { code?: unknown; cause?: { code?: unknown } })?.code
    ?? (error as { cause?: { code?: unknown } })?.cause?.code;
  return code === "23505";
}

/**
 * Creates (no `id`) or updates a post.
 *
 * "draft" saves the fields and leaves the status alone — a published post
 * stays published with its edits live, a draft stays a draft. "publish"
 * also sets `status` and `published_at` (`resolvePublishedAt`). Taking a
 * post down is `unpublishPost`, never a side effect of saving.
 */
export async function savePost(
  id: string | null,
  input: PostInput,
  intent: SaveIntent,
  now: Date = new Date(),
): Promise<SaveResult> {
  const db = getDb();
  const existing = id ? await getPostById(id) : null;
  if (id && !existing) return { ok: false, reason: "not_found" };

  const status: PostStatus = intent === "publish" ? "published" : (existing?.status ?? "draft");
  const publishedAt =
    intent === "publish"
      ? resolvePublishedAt(input.publishedOn, existing?.publishedAt ?? null, now)
      : input.publishedOn !== null
        ? resolvePublishedAt(input.publishedOn, null, now)
        : (existing?.publishedAt ?? null);

  const values = {
    kind: input.kind,
    slug: input.slug,
    title: input.title,
    excerpt: input.excerpt,
    body: input.body,
    coverImageUrl: input.coverImageUrl,
    coverImageAlt: input.coverImageAlt,
    category: input.category,
    tags: input.tags,
    references: input.references,
    sourceName: input.sourceName,
    sourceUrl: input.sourceUrl,
    sourcePublishedOn: input.sourcePublishedOn,
    featured: input.featured,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    status,
    publishedAt,
    updatedAt: now,
  };

  try {
    if (existing) {
      await db.update(posts).set(values).where(eq(posts.id, existing.id));
      return {
        ok: true,
        id: existing.id,
        kind: input.kind,
        slug: input.slug,
        status,
        previousSlug: existing.slug !== input.slug || existing.kind !== input.kind ? existing.slug : null,
        previousCoverImageUrl: existing.coverImageUrl,
      };
    }
    const [row] = await db.insert(posts).values(values).returning({ id: posts.id });
    return { ok: true, id: row.id, kind: input.kind, slug: input.slug, status, previousSlug: null, previousCoverImageUrl: null };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, reason: "slug_taken" };
    throw error;
  }
}

/** Back to a draft. Keeps `published_at`, so republishing keeps its date. */
export async function unpublishPost(
  id: string,
  now: Date = new Date(),
): Promise<{ kind: PostKind; slug: string } | null> {
  const [row] = await getDb()
    .update(posts)
    .set({ status: "draft", updatedAt: now })
    .where(eq(posts.id, id))
    .returning({ kind: posts.kind, slug: posts.slug });
  return row ?? null;
}
