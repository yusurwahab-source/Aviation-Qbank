import type { Metadata } from "next";

import { PageHeading } from "@/components/ui";
import { requireOwner } from "@/lib/auth/require-owner";
import { isPostKind, POST_KIND_LABEL } from "@/lib/posts";

import { OwnerNav, OwnerPageError, renderOwnerPage } from "../../owner-ui";
import { editorValues } from "../editor-values";
import { PostEditor } from "../post-editor";

export const metadata: Metadata = { title: "New post" };
export const dynamic = "force-dynamic";

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string | string[] }>;
}) {
  const raw = (await searchParams).kind;
  const kind = isPostKind(Array.isArray(raw) ? raw[0] : raw) ? ((Array.isArray(raw) ? raw[0] : raw) as "blog" | "article") : "blog";

  return renderOwnerPage(
    async () => {
      await requireOwner();
      return (
        <>
          <PageHeading title={`New ${POST_KIND_LABEL[kind].singular.toLowerCase()}`} />
          <OwnerNav current="/owner/content" />
          <PostEditor id={null} status={null} initial={editorValues(null, kind)} />
        </>
      );
    },
    (detail) => <OwnerPageError detail={detail} />,
  );
}
