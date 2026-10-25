import { inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { getDb } from "@/db";
import {
  getPublishedPost,
  listLatestPosts,
  listPostsForSitemap,
  listPublishedPosts,
  savePost,
  unpublishPost,
} from "@/db/posts";
import { posts } from "@/db/schema";
import type { PostInput } from "@/lib/posts";

/**
 * The public half of `db/posts.ts` against a real database: a draft and a
 * scheduled post never reach a public query, publishing and unpublishing
 * move a post in and out, and two posts of one kind cannot share an address.
 *
 * Every slug here carries a random suffix and only these rows are asserted
 * on, because other runs may leave their own posts in the same database.
 */

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

describeDb("posts", () => {
  const suffix = Math.random().toString(36).slice(2, 8);
  const created: string[] = [];

  const input = (slug: string, overrides: Partial<PostInput> = {}): PostInput => ({
    kind: "article",
    title: `Test ${slug}`,
    slug: `${slug}-${suffix}`,
    excerpt: "Excerpt",
    body: "Body",
    coverImageUrl: null,
    coverImageAlt: null,
    category: `cat-${suffix}`,
    tags: [],
    references: [],
    sourceName: null,
    sourceUrl: null,
    sourcePublishedOn: null,
    publishedOn: null,
    featured: false,
    seoTitle: null,
    seoDescription: null,
    ...overrides,
  });

  async function save(slug: string, intent: "draft" | "publish", overrides: Partial<PostInput> = {}) {
    const result = await savePost(null, input(slug, overrides), intent);
    if (!result.ok) throw new Error(result.reason);
    created.push(result.id);
    return result;
  }

  afterAll(async () => {
    if (created.length > 0) await getDb().delete(posts).where(inArray(posts.id, created));
  });

  it("shows published posts and never drafts or scheduled posts", async () => {
    await save("published", "publish");
    await save("draft", "draft");
    await save("scheduled", "publish", { publishedOn: "2999-01-01" });

    const { rows } = await listPublishedPosts("article", { limit: 100, offset: 0, category: `cat-${suffix}` });
    expect(rows.map((r) => r.slug)).toEqual([`published-${suffix}`]);

    expect(await getPublishedPost("article", `published-${suffix}`)).not.toBeNull();
    expect(await getPublishedPost("article", `draft-${suffix}`)).toBeNull();
    expect(await getPublishedPost("article", `scheduled-${suffix}`)).toBeNull();
    expect(await getPublishedPost("blog", `published-${suffix}`)).toBeNull();

    const sitemapSlugs = (await listPostsForSitemap()).map((p) => p.slug);
    expect(sitemapSlugs).toContain(`published-${suffix}`);
    expect(sitemapSlugs).not.toContain(`draft-${suffix}`);
    expect(sitemapSlugs).not.toContain(`scheduled-${suffix}`);
  });

  it("puts a featured article first in the homepage list", async () => {
    await save("plain", "publish", { publishedOn: "2026-10-20" });
    await save("featured", "publish", { publishedOn: "2020-01-01", featured: true });
    const latest = (await listLatestPosts("article", 200)).map((p) => p.slug);
    expect(latest.indexOf(`featured-${suffix}`)).toBeLessThan(latest.indexOf(`plain-${suffix}`));
  });

  it("takes a post down when unpublished", async () => {
    const { id } = await save("down", "publish");
    expect(await getPublishedPost("article", `down-${suffix}`)).not.toBeNull();
    await unpublishPost(id);
    expect(await getPublishedPost("article", `down-${suffix}`)).toBeNull();
  });

  it("refuses a second post with the same address in the same kind", async () => {
    await save("taken", "draft");
    expect(await savePost(null, input("taken"), "draft")).toEqual({ ok: false, reason: "slug_taken" });
    const blog = await savePost(null, input("taken", { kind: "blog" }), "draft");
    expect(blog.ok).toBe(true);
    if (blog.ok) created.push(blog.id);
  });
});
