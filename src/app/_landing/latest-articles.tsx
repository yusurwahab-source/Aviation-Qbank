import Link from "next/link";

import { PostCover } from "@/components/posts/post-cover";
import { listLatestPosts, type PostSummary } from "@/db/posts";
import { formatPostDate, POST_KIND_PATH, postPath } from "@/lib/posts";

/**
 * The three newest published Articles, newest first, under the resource
 * cards. Blog posts never appear here — the two kinds stay apart.
 *
 * The query only ever returns published posts dated now or earlier
 * (`db/posts.ts`), so a draft or a scheduled post cannot reach the
 * homepage. Publishing revalidates `/`, so a new article shows at once; a
 * scheduled one shows at the page's next hourly revalidation.
 *
 * With nothing published yet it says so in one line. If the database does
 * not answer, the section is left out rather than taking the page down.
 */
export const LATEST_ARTICLE_COUNT = 3;

export async function LatestArticles() {
  let articles: PostSummary[];
  try {
    articles = await listLatestPosts("article", LATEST_ARTICLE_COUNT);
  } catch (error) {
    console.error("Failed to load the latest articles:", error);
    return null;
  }

  return (
    <section aria-labelledby="latest-articles-heading">
      <div className="mb-3 flex items-baseline justify-between gap-4 sm:mb-4">
        <h2 id="latest-articles-heading" className="text-lg font-semibold text-foreground sm:text-xl">
          Latest Articles
        </h2>
        <Link
          href={POST_KIND_PATH.article}
          className="link-standalone shrink-0 text-sm font-semibold text-brand-ink hover:underline"
        >
          View All Articles →
        </Link>
      </div>

      {articles.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-5 text-sm text-muted-foreground">
          No articles have been published yet.
        </p>
      ) : (
        <ul className="grid gap-3 sm:gap-4 md:grid-cols-3">
          {articles.map((article) => (
            <li key={article.id}>
              <ArticleTeaser article={article} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The same shape as a resource card: a row on a phone, a column from `md`. */
function ArticleTeaser({ article }: { article: PostSummary }) {
  return (
    <article className="group relative flex h-full items-center gap-4 overflow-hidden rounded-xl border border-border bg-surface p-3 shadow-sm transition focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-2 focus-within:ring-offset-background hover:border-brand hover:shadow-md motion-reduce:transition-none md:flex-col md:items-stretch md:gap-0 md:p-0">
      <div className="w-28 shrink-0 overflow-hidden rounded-lg sm:w-36 md:w-full md:rounded-none">
        <PostCover kind="article" src={article.coverImageUrl} alt={article.coverImageAlt} />
      </div>
      <div className="min-w-0 flex-1 md:p-5">
        <p className="text-xs font-medium text-muted-foreground">
          {article.category ? <span className="text-brand-ink">{article.category}</span> : null}
          {article.category && article.publishedAt ? <span aria-hidden="true"> · </span> : null}
          {article.publishedAt ? (
            <time dateTime={article.publishedAt.toISOString()}>{formatPostDate(article.publishedAt)}</time>
          ) : null}
        </p>
        <h3 className="mt-1 line-clamp-3 text-sm font-semibold leading-snug text-foreground sm:text-base">
          <Link
            href={postPath(article.kind, article.slug)}
            className="outline-none after:absolute after:inset-0 after:content-['']"
          >
            {article.title}
          </Link>
        </h3>
      </div>
    </article>
  );
}
