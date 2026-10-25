import Link from "next/link";

import { Badge } from "@/components/ui";
import type { Post } from "@/db/schema";
import { formatPostDate, POST_KIND_LABEL, POST_KIND_PATH, readingMinutes } from "@/lib/posts";

import { PostBody } from "./post-body";
import { PostCover } from "./post-cover";

/**
 * A whole post as a reader sees it. The public page and the owner's preview
 * both render this, so a preview is exactly what will be published.
 *
 * A news post names its source and links to it; an article lists its
 * references. Both are shown only when the owner supplied them — nothing
 * here invents a citation or a date.
 */
export function PostView({ post }: { post: Post }) {
  const label = POST_KIND_LABEL[post.kind];
  const minutes = readingMinutes(post.body);

  return (
    <article className="mx-auto max-w-3xl">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link href={POST_KIND_PATH[post.kind]} className="link-standalone text-brand-ink hover:underline">
          ← {label.plural}
        </Link>
      </nav>

      <header className="mt-4">
        <p className="text-sm font-medium text-muted-foreground">
          {post.category ? <span className="text-brand-ink">{post.category}</span> : null}
          {post.category ? <span aria-hidden="true"> · </span> : null}
          {post.publishedAt ? (
            <time dateTime={post.publishedAt.toISOString()}>{formatPostDate(post.publishedAt)}</time>
          ) : (
            <span>Not published</span>
          )}
          <span aria-hidden="true"> · </span>
          <span>{minutes} min read</span>
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl lg:text-[2.5rem] lg:leading-[1.15]">
          {post.title}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">{post.excerpt}</p>
      </header>

      {post.coverImageUrl ? (
        <PostCover
          kind={post.kind}
          src={post.coverImageUrl}
          alt={post.coverImageAlt}
          eager
          className="mt-8 rounded-xl border border-border"
        />
      ) : null}

      {post.sourceName || post.sourceUrl ? (
        <aside className="mt-8 rounded-xl border border-border bg-surface-muted p-4 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Source: </span>
          {post.sourceUrl ? (
            <a
              href={post.sourceUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-brand-ink underline underline-offset-2"
            >
              {post.sourceName ?? post.sourceUrl}
            </a>
          ) : (
            post.sourceName
          )}
          {post.sourcePublishedOn ? <span> — {formatPostDate(new Date(`${post.sourcePublishedOn}T00:00:00Z`))}</span> : null}
          <span>. This is our own summary; read the original for the full report.</span>
        </aside>
      ) : null}

      <div className="mt-8">
        <PostBody markdown={post.body} />
      </div>

      {post.references.length > 0 ? (
        <section aria-labelledby="references-heading" className="mt-12 border-t border-border pt-6">
          <h2 id="references-heading" className="text-lg font-semibold text-foreground">
            References
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            {post.references.map((reference) => (
              <li key={reference.url + reference.title}>
                <a
                  href={reference.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-ink underline underline-offset-2"
                >
                  {reference.title}
                </a>
                {reference.publisher ? <span>, {reference.publisher}</span> : null}
                {reference.date ? <span> ({reference.date})</span> : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {post.tags.length > 0 ? (
        <ul className="mt-8 flex flex-wrap gap-2" aria-label="Tags">
          {post.tags.map((tag) => (
            <li key={tag}>
              <Badge>{tag}</Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
