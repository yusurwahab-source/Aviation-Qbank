import Link from "next/link";

import type { PostSummary } from "@/db/posts";
import { formatPostDate, postPath } from "@/lib/posts";

import { PostCover } from "./post-cover";

/**
 * One post in a list — the Blog and Articles pages and the homepage
 * previews. One stretched link on the title, like the product cards, so the
 * whole card is one tap target and its accessible name is the title.
 */
export function PostCard({ post, headingLevel = "h3" }: { post: PostSummary; headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-2 focus-within:ring-offset-background hover:shadow-md motion-reduce:transition-none">
      <PostCover kind={post.kind} src={post.coverImageUrl} alt={post.coverImageAlt} />
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-medium text-muted-foreground">
          {post.category ? <span className="text-brand-ink">{post.category}</span> : null}
          {post.category && post.publishedAt ? <span aria-hidden="true"> · </span> : null}
          {post.publishedAt ? <time dateTime={post.publishedAt.toISOString()}>{formatPostDate(post.publishedAt)}</time> : null}
        </p>
        <Heading className="mt-2 text-base font-semibold leading-snug text-foreground sm:text-lg">
          <Link
            href={postPath(post.kind, post.slug)}
            className="outline-none after:absolute after:inset-0 after:content-['']"
          >
            {post.title}
          </Link>
        </Heading>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
      </div>
    </article>
  );
}
