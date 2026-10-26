import type { Metadata } from "next";

import { LIST_COPY, PostListPage } from "../_posts/post-list-page";

export const metadata: Metadata = {
  title: "Articles",
  description: LIST_COPY.article.description,
  alternates: { canonical: "/articles" },
};

/** Reads `?category=` and `?page=`, so it renders per request. */
export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <PostListPage kind="article" searchParams={await searchParams} />;
}
