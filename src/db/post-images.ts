import "server-only";

import { and, eq, lt, notExists, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { postImages, posts } from "@/db/schema";
import { postImageUrl, type PostImageType } from "@/lib/post-images";

/**
 * Uploaded cover images. `insertPostImage` and the cleanup are reached only
 * from the owner's upload route and editor action, behind the owner gate;
 * `getPostImage` is read by the public image route, which serves bytes for
 * an unguessable id and nothing else.
 */

export async function insertPostImage(input: {
  contentType: PostImageType;
  data: Buffer;
  fileName: string;
  uploadedBy: string;
}): Promise<{ id: string; url: string }> {
  const [row] = await getDb()
    .insert(postImages)
    .values({
      contentType: input.contentType,
      byteSize: input.data.length,
      data: input.data,
      fileName: input.fileName,
      uploadedBy: input.uploadedBy,
    })
    .returning({ id: postImages.id });
  return { id: row.id, url: postImageUrl(row.id) };
}

export async function getPostImage(
  id: string,
): Promise<{ contentType: string; data: Buffer; createdAt: Date } | null> {
  const [row] = await getDb()
    .select({ contentType: postImages.contentType, data: postImages.data, createdAt: postImages.createdAt })
    .from(postImages)
    .where(eq(postImages.id, id))
    .limit(1);
  return row ?? null;
}

/**
 * Deletes an uploaded image unless some post still uses it as its cover —
 * so replacing or removing a cover can clean up after itself without ever
 * pulling a picture out from under a live page.
 */
export async function deletePostImageIfUnused(id: string): Promise<boolean> {
  const rows = await getDb()
    .delete(postImages)
    .where(
      and(
        eq(postImages.id, id),
        notExists(
          getDb()
            .select({ one: sql`1` })
            .from(posts)
            .where(eq(posts.coverImageUrl, postImageUrl(id))),
        ),
      ),
    )
    .returning({ id: postImages.id });
  return rows.length > 0;
}

/**
 * Sweeps images uploaded more than `olderThanHours` ago that no post uses —
 * a picture chosen in the editor and then abandoned. Run opportunistically
 * on each upload; the age floor keeps it away from an image whose post has
 * not been saved yet.
 */
export async function deleteStalePostImages(olderThanHours = 24): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanHours * 3_600_000);
  const rows = await getDb()
    .delete(postImages)
    .where(
      and(
        lt(postImages.createdAt, cutoff),
        notExists(
          getDb()
            .select({ one: sql`1` })
            .from(posts)
            .where(eq(posts.coverImageUrl, sql`'/api/post-images/' || ${postImages.id}::text`)),
        ),
      ),
    )
    .returning({ id: postImages.id });
  return rows.length;
}
