import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PostView } from "@/components/posts/post-view";
import { getPostById } from "@/db/posts";
import { requireOwner } from "@/lib/auth/require-owner";
import { isPubliclyVisible } from "@/lib/posts";

import { OwnerPageError, renderOwnerPage } from "../../../owner-ui";

export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * The saved version of a post, drawn by the same component the public page
 * uses, with a banner saying whether it is live. Owner only; a 404 for
 * everyone else, exactly like the rest of `/owner`.
 */
export default async function PreviewPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return renderOwnerPage(
    async () => {
      await requireOwner();
      const post = await getPostById(id);
      if (!post) notFound();
      const live = isPubliclyVisible(post, new Date());

      return (
        <>
          <div className="mb-8 rounded-xl border border-warning bg-warning-soft p-4 text-sm text-foreground">
            <strong>Preview.</strong>{" "}
            {live
              ? "This is the saved version, and it is live on the site."
              : post.status === "published"
                ? "This post is scheduled: it will appear on its publication date."
                : "This is a draft. Nobody else can see it until you publish it."}{" "}
            <Link href={`/owner/content/${post.id}`} className="text-brand-ink underline underline-offset-2">
              Back to the editor
            </Link>
          </div>
          <PostView post={post} />
        </>
      );
    },
    (detail) => <OwnerPageError detail={detail} />,
  );
}
