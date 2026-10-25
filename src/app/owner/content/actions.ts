"use server";

import { revalidatePath } from "next/cache";

import { savePost, unpublishPost } from "@/db/posts";
import { ownerAction } from "@/lib/owner/audited-action";
import { POST_KIND_PATH, postPath, validatePost, type PostInput, type PostStatus } from "@/lib/posts";

/**
 * The owner's Blog and Articles editor.
 *
 * Both actions go through `ownerAction`, which calls `requireOwner()` before
 * anything else — a server action is its own reachable entry point, so the
 * page having checked does not cover it — and writes the audit log entry
 * only when something actually changed. Every field is validated by
 * `validatePost` (`lib/posts.ts`) before it reaches the database.
 */

export type PostEditorState = {
  errors?: string[];
  message?: string;
  /** Set after a save, so the editor knows the post's id and status. */
  id?: string;
  status?: PostStatus;
  /** Set when a new post was created: the editor moves to its own page. */
  redirectTo?: string;
};

type SaveInput = { id: string | null; intent: "draft" | "publish"; post: PostInput };

const FIELD_NAMES = [
  "kind",
  "title",
  "slug",
  "excerpt",
  "body",
  "coverImageUrl",
  "coverImageAlt",
  "category",
  "tags",
  "references",
  "sourceName",
  "sourceUrl",
  "sourcePublishedOn",
  "publishedOn",
  "featured",
  "seoTitle",
  "seoDescription",
] as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function refreshPublicPages(kind: PostInput["kind"], slugs: (string | null)[]) {
  for (const slug of slugs) if (slug) revalidatePath(postPath(kind, slug));
}

export const savePostAction = ownerAction<PostEditorState, SaveInput>({
  action: (input) => (input.intent === "publish" ? "post.publish" : input.id ? "post.update" : "post.create"),
  targetType: (input) => input.post.kind,

  parse(formData) {
    const rawId = formData.get("id");
    const id = typeof rawId === "string" && UUID.test(rawId) ? rawId : null;
    const intent = formData.get("intent") === "publish" ? "publish" : "draft";

    const raw = Object.fromEntries(FIELD_NAMES.map((name) => [name, formData.get(name)])) as Record<
      (typeof FIELD_NAMES)[number],
      unknown
    >;
    const result = validatePost(raw, intent);
    if (!result.ok) return { ok: false, state: { errors: result.errors } };
    return { ok: true, input: { id, intent, post: result.input } };
  },

  async run({ id, intent, post }) {
    const result = await savePost(id, post, intent);
    if (!result.ok) {
      return {
        ok: false,
        state: {
          errors: [
            result.reason === "slug_taken"
              ? `Another ${post.kind === "blog" ? "blog post" : "article"} already uses the address “${post.slug}”. Choose a different one.`
              : "This post no longer exists. It may have been deleted in another tab.",
          ],
        },
      };
    }

    refreshPublicPages(post.kind, [result.slug, result.previousSlug]);

    return {
      ok: true,
      targetId: result.id,
      metadata: { kind: post.kind, slug: result.slug, status: result.status },
      state: {
        id: result.id,
        status: result.status,
        message:
          intent === "publish"
            ? "Published."
            : result.status === "published"
              ? "Saved. The changes are live."
              : "Draft saved.",
        ...(id === null ? { redirectTo: `/owner/content/${result.id}` } : {}),
      },
    };
  },

  revalidate: (input) => [
    { path: "/" },
    { path: POST_KIND_PATH[input.post.kind] },
    { path: "/sitemap.xml" },
    { path: "/owner/content" },
  ],
});

export type UnpublishState = { error?: string; message?: string };

export const unpublishPostAction = ownerAction<UnpublishState, { id: string }>({
  action: "post.unpublish",
  targetType: "post",

  parse(formData) {
    const id = formData.get("id");
    if (typeof id !== "string" || !UUID.test(id)) return { ok: false, state: { error: "Unknown post." } };
    if (formData.get("confirmed") !== "yes") return { ok: false, state: { error: "Confirm first." } };
    return { ok: true, input: { id } };
  },

  async run({ id }) {
    const row = await unpublishPost(id);
    if (!row) return { ok: false, state: { error: "This post no longer exists." } };
    revalidatePath(postPath(row.kind, row.slug));
    revalidatePath(POST_KIND_PATH[row.kind]);
    return { ok: true, targetId: id, metadata: row, state: { message: "Unpublished. It is a draft again." } };
  },

  revalidate: [{ path: "/" }, { path: "/sitemap.xml" }, { path: "/owner/content" }],
});
