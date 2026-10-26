import Link from "next/link";
import type { Metadata } from "next";

import { Badge, EmptyState, PageHeading } from "@/components/ui";
import { listAllPosts } from "@/db/posts";
import { requireOwner } from "@/lib/auth/require-owner";
import { isPostKind, isPubliclyVisible, POST_KIND_LABEL, postPath, type PostStatus } from "@/lib/posts";

import { OwnerNav, OwnerPageError, formatDay, renderOwnerPage } from "../owner-ui";

export const metadata: Metadata = { title: "Blog & Articles" };
export const dynamic = "force-dynamic";

function firstOf(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

const KIND_FILTERS = [
  { value: "", label: "All" },
  { value: "blog", label: "Blogs" },
  { value: "article", label: "Articles" },
] as const;

const STATUS_FILTERS = [
  { value: "", label: "Any status" },
  { value: "draft", label: "Drafts" },
  { value: "published", label: "Published" },
] as const;

/**
 * Every Blog post and Article, drafts included, newest edit first. Only the
 * owner can reach this page (`requireOwner()`); everyone else gets a 404.
 */
export default async function OwnerContentPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string | string[]; status?: string | string[] }>;
}) {
  const params = await searchParams;
  const kindParam = firstOf(params.kind);
  const statusParam = firstOf(params.status);
  const kind = isPostKind(kindParam) ? kindParam : null;
  const status: PostStatus | null = statusParam === "draft" || statusParam === "published" ? statusParam : null;

  return renderOwnerPage(
    async () => {
      await requireOwner();
      const rows = await listAllPosts({ kind, status });
      const now = new Date();
      const filterHref = (next: { kind?: string; status?: string }) => {
        const query = new URLSearchParams();
        const k = next.kind ?? kind ?? "";
        const s = next.status ?? status ?? "";
        if (k) query.set("kind", k);
        if (s) query.set("status", s);
        const text = query.toString();
        return text ? `/owner/content?${text}` : "/owner/content";
      };

      return (
        <>
          <PageHeading title="Blog & Articles" subtitle="Write, preview, publish and unpublish. Drafts are visible only here." />
          <OwnerNav current="/owner/content" />

          <div className="mb-6 flex flex-wrap gap-2">
            <Link href="/owner/content/new?kind=blog" className="tap-target inline-flex items-center rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid hover:bg-brand-strong">
              New blog post
            </Link>
            <Link href="/owner/content/new?kind=article" className="tap-target inline-flex items-center rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid hover:bg-brand-strong">
              New article
            </Link>
          </div>

          <div className="mb-6 flex flex-wrap gap-2 text-sm">
            {KIND_FILTERS.map((f) => (
              <Link key={f.label} href={filterHref({ kind: f.value })} aria-current={(kind ?? "") === f.value ? "page" : undefined} className={`tap-target inline-flex items-center rounded-full px-4 ${(kind ?? "") === f.value ? "bg-brand text-on-solid" : "border border-border text-muted-foreground"}`}>
                {f.label}
              </Link>
            ))}
            <span className="mx-1 self-center text-border" aria-hidden="true">|</span>
            {STATUS_FILTERS.map((f) => (
              <Link key={f.label} href={filterHref({ status: f.value })} aria-current={(status ?? "") === f.value ? "page" : undefined} className={`tap-target inline-flex items-center rounded-full px-4 ${(status ?? "") === f.value ? "bg-brand text-on-solid" : "border border-border text-muted-foreground"}`}>
                {f.label}
              </Link>
            ))}
          </div>

          {rows.length === 0 ? (
            <EmptyState title="Nothing here yet.">Start with “New blog post” or “New article”.</EmptyState>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
              {rows.map((post) => {
                const live = isPubliclyVisible(post, now);
                const scheduled = post.status === "published" && !live;
                return (
                  <li key={post.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{POST_KIND_LABEL[post.kind].singular}</Badge>
                        <Badge tone={live ? "correct" : scheduled ? "warning" : "neutral"}>
                          {live ? "Published" : scheduled ? "Scheduled" : "Draft"}
                        </Badge>
                        {post.featured ? <Badge tone="brand">Featured</Badge> : null}
                      </div>
                      <Link href={`/owner/content/${post.id}`} className="mt-2 block font-semibold text-foreground hover:underline">
                        {post.title}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Edited {formatDay(post.updatedAt)}
                        {post.publishedAt ? ` · dated ${formatDay(post.publishedAt)}` : ""}
                        {post.category ? ` · ${post.category}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2 text-sm">
                      <Link href={`/owner/content/${post.id}`} className="tap-target inline-flex items-center rounded-lg border border-border px-3 hover:border-brand">
                        Edit
                      </Link>
                      {live ? (
                        <Link href={postPath(post.kind, post.slug)} className="tap-target inline-flex items-center rounded-lg border border-border px-3 hover:border-brand">
                          View
                        </Link>
                      ) : (
                        <Link href={`/owner/content/${post.id}/preview`} className="tap-target inline-flex items-center rounded-lg border border-border px-3 hover:border-brand">
                          Preview
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      );
    },
    (detail) => (
      <>
        <PageHeading title="Blog & Articles" />
        <OwnerNav current="/owner/content" />
        <OwnerPageError detail={detail} />
      </>
    ),
  );
}
