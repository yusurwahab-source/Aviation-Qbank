import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeading } from "@/components/ui";
import { getPostById } from "@/db/posts";
import { requireOwner } from "@/lib/auth/require-owner";
import { isPubliclyVisible, postPath } from "@/lib/posts";

import { OwnerNav, OwnerPageError, renderOwnerPage } from "../../owner-ui";
import { editorValues } from "../editor-values";
import { PostEditor } from "../post-editor";

export const metadata: Metadata = { title: "Edit post" };
export const dynamic = "force-dynamic";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return renderOwnerPage(
    async () => {
      await requireOwner();
      const post = await getPostById(id);
      if (!post) notFound();
      const live = isPubliclyVisible(post, new Date());

      return (
        <>
          <PageHeading title={post.title || "Untitled"} />
          <OwnerNav current="/owner/content" />
          <p className="mb-6 text-sm">
            <Link href="/owner/content" className="text-brand-ink underline underline-offset-2">
              ← All posts
            </Link>
            {live ? (
              <>
                {" · "}
                <Link href={postPath(post.kind, post.slug)} className="text-brand-ink underline underline-offset-2">
                  View on the site
                </Link>
              </>
            ) : null}
          </p>
          <PostEditor id={post.id} status={post.status} initial={editorValues(post, post.kind)} />
        </>
      );
    },
    (detail) => <OwnerPageError detail={detail} />,
  );
}
