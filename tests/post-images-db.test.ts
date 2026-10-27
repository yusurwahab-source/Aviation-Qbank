import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { getDb } from "@/db";
import { deletePostImageIfUnused, deleteStalePostImages, getPostImage, insertPostImage } from "@/db/post-images";
import { savePost } from "@/db/posts";
import { postImages, posts } from "@/db/schema";
import type { PostInput } from "@/lib/posts";

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

describeDb("post images", () => {
  const suffix = Math.random().toString(36).slice(2, 8);
  const imageIds: string[] = [];
  const postIds: string[] = [];
  let counter = 0;

  const upload = async () => {
    const data = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
    const image = await insertPostImage({ contentType: "image/jpeg", data, fileName: "a.jpg", uploadedBy: "owner@example.com" });
    imageIds.push(image.id);
    return image;
  };

  const input = (cover: string | null): PostInput => ({
    kind: "blog",
    title: `Img ${suffix}`,
    slug: `img-${suffix}-${counter++}`,
    excerpt: "e",
    body: "b",
    coverImageUrl: cover,
    coverImageAlt: cover ? "alt" : null,
    category: null,
    tags: [],
    references: [],
    sourceName: null,
    sourceUrl: null,
    sourcePublishedOn: null,
    publishedOn: null,
    featured: false,
    seoTitle: null,
    seoDescription: null,
  });

  afterAll(async () => {
    const db = getDb();
    for (const id of postIds) await db.delete(posts).where(eq(posts.id, id));
    for (const id of imageIds) await db.delete(postImages).where(eq(postImages.id, id));
  });

  it("stores the bytes and reads them back", async () => {
    const image = await upload();
    expect(image.url).toBe(`/api/post-images/${image.id}`);
    const stored = await getPostImage(image.id);
    expect(stored?.contentType).toBe("image/jpeg");
    expect([...(stored?.data ?? [])]).toEqual([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
  });

  it("will not delete an image a post still uses, and deletes it once it is free", async () => {
    const image = await upload();
    const saved = await savePost(null, input(image.url), "draft");
    if (!saved.ok) throw new Error("save failed");
    postIds.push(saved.id);

    expect(await deletePostImageIfUnused(image.id)).toBe(false);
    expect(await getPostImage(image.id)).not.toBeNull();

    const cleared = await savePost(saved.id, { ...input(null), slug: `img-${suffix}-kept` }, "draft");
    expect(cleared.ok && cleared.previousCoverImageUrl).toBe(image.url);
    expect(await deletePostImageIfUnused(image.id)).toBe(true);
    expect(await getPostImage(image.id)).toBeNull();
  });

  it("sweeps old unused images but keeps recent ones and used ones", async () => {
    const old = await upload();
    const recent = await upload();
    const used = await upload();
    const saved = await savePost(null, input(used.url), "draft");
    if (!saved.ok) throw new Error("save failed");
    postIds.push(saved.id);

    const db = getDb();
    const longAgo = new Date(Date.now() - 48 * 3_600_000);
    await db.update(postImages).set({ createdAt: longAgo }).where(eq(postImages.id, old.id));
    await db.update(postImages).set({ createdAt: longAgo }).where(eq(postImages.id, used.id));

    await deleteStalePostImages();

    expect(await getPostImage(old.id)).toBeNull();
    expect(await getPostImage(recent.id)).not.toBeNull();
    expect(await getPostImage(used.id)).not.toBeNull();
  });
});
