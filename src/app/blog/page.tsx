import type { Metadata } from "next";

import { LIST_COPY, PostListPage } from "../_posts/post-list-page";

export const metadata: Metadata = {
  title: "Blog",
  description: LIST_COPY.blog.subtitle,
  alternates: { canonical: "/blog" },
};

/** Reads `?category=` and `?page=`, so it renders per request. */
export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <PostListPage kind="blog" searchParams={await searchParams} />;
}
