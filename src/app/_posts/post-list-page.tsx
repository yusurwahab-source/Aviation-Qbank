import Link from "next/link";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { PostCard } from "@/components/posts/post-card";
import { EmptyState, PageHeading } from "@/components/ui";
import { listPublishedCategories, listPublishedPosts, type PostSummary } from "@/db/posts";
import { POST_KIND_PATH, type PostKind } from "@/lib/posts";

/**
 * The Blog and Articles index pages: one implementation, two routes
 * (`/blog` and `/articles`), so the two sections stay visually related
 * while their own copy keeps them distinct.
 *
 * Only published posts dated now or earlier are listed (`db/posts.ts`).
 * With none yet the page says so plainly — there are no sample posts to
 * fill it.
 */

export const PAGE_SIZE = 12;

export const LIST_COPY: Record<PostKind, { eyebrow: string; title: string; subtitle: string; empty: string }> = {
  blog: {
    eyebrow: "Blog",
    title: "Aviation news and PilotQBank updates",
    subtitle:
      "Short summaries of aviation and industry news, with a link to every original source, and announcements about the platform.",
    empty: "Nothing has been posted on the Blog yet.",
  },
  article: {
    eyebrow: "Articles",
    title: "Articles for pilots and student pilots",
    subtitle:
      "Longer reads on aviation theory, regulations and technical subjects, with practical guidance for your studies and references you can check.",
    empty: "No articles have been published yet.",
  },
};

function firstOf(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export async function PostListPage({
  kind,
  searchParams,
}: {
  kind: PostKind;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const copy = LIST_COPY[kind];
  const base = POST_KIND_PATH[kind];
  const category = firstOf(searchParams.category).slice(0, 60) || null;
  const pageNumber = Math.max(1, Math.min(1000, Number.parseInt(firstOf(searchParams.page), 10) || 1));

  let rows: PostSummary[] = [];
  let total = 0;
  let categories: string[] = [];
  let failed = false;
  try {
    [{ rows, total }, categories] = await Promise.all([
      listPublishedPosts(kind, { limit: PAGE_SIZE, offset: (pageNumber - 1) * PAGE_SIZE, category }),
      listPublishedCategories(kind),
    ]);
  } catch (error) {
    console.error(`Failed to load ${base}:`, error);
    failed = true;
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (page: number, cat: string | null = category) => {
    const params = new URLSearchParams();
    if (cat) params.set("category", cat);
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    return query ? `${base}?${query}` : base;
  };

  return (
    <div className="font-reading">
      <PageHeading eyebrow={copy.eyebrow} title={copy.title} subtitle={copy.subtitle} />

      {categories.length > 1 ? (
        <nav aria-label="Categories" className="mb-6 flex flex-wrap gap-2">
          {[null, ...categories].map((cat) => {
            const active = cat === category;
            return (
              <Link
                key={cat ?? "all"}
                href={href(1, cat)}
                aria-current={active ? "page" : undefined}
                className={`tap-target inline-flex items-center rounded-full px-4 text-sm font-medium transition ${
                  active
                    ? "bg-brand text-on-solid"
                    : "border border-border bg-surface text-muted-foreground hover:border-brand hover:text-brand-ink"
                }`}
              >
                {cat ?? "All"}
              </Link>
            );
          })}
        </nav>
      ) : null}

      {failed ? (
        <DatabaseUnavailable />
      ) : rows.length === 0 ? (
        <EmptyState title={category ? `Nothing in “${category}” yet.` : copy.empty}>
          {category ? (
            <Link href={base} className="text-brand-ink underline underline-offset-2">
              See everything
            </Link>
          ) : null}
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((post) => (
            <li key={post.id}>
              <PostCard post={post} headingLevel="h2" />
            </li>
          ))}
        </ul>
      )}

      {pages > 1 ? (
        <nav aria-label="Pages" className="mt-10 flex items-center justify-between gap-4 text-sm">
          {pageNumber > 1 ? (
            <Link href={href(pageNumber - 1)} className="tap-target inline-flex items-center rounded-lg border border-border px-4 font-medium text-foreground hover:border-brand">
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">
            Page {pageNumber} of {pages}
          </span>
          {pageNumber < pages ? (
            <Link href={href(pageNumber + 1)} className="tap-target inline-flex items-center rounded-lg border border-border px-4 font-medium text-foreground hover:border-brand">
              Older →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
