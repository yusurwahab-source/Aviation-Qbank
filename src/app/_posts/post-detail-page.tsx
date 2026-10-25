import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PostView } from "@/components/posts/post-view";
import { siteConfig } from "@/config/site";
import { getPublishedPost } from "@/db/posts";
import type { Post } from "@/db/schema";
import { canonicalUrl } from "@/lib/canonical-url";
import { postPath, type PostKind } from "@/lib/posts";

/**
 * One published post: `/blog/<slug>` and `/articles/<slug>`.
 *
 * A draft, a scheduled post or an unknown slug is a plain 404 — the query
 * itself refuses them (`getPublishedPost`), so there is no branch here that
 * could leak one.
 */

const SLUG = /^[a-z0-9-]{1,120}$/;

async function load(kind: PostKind, slug: string): Promise<Post | null> {
  if (!SLUG.test(slug)) return null;
  try {
    return await getPublishedPost(kind, slug);
  } catch (error) {
    console.error(`Failed to load ${kind} ${slug}:`, error);
    throw error;
  }
}

export async function postMetadata(kind: PostKind, slug: string): Promise<Metadata> {
  const post = await load(kind, slug).catch(() => null);
  if (!post) return { title: "Not found" };

  const title = post.seoTitle ?? post.title;
  const description = post.seoDescription ?? post.excerpt;
  const url = postPath(kind, post.slug);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      ...(post.coverImageUrl ? { images: [{ url: post.coverImageUrl, alt: post.coverImageAlt ?? "" }] } : {}),
    },
  };
}

function jsonLd(post: Post) {
  const base = canonicalUrl().replace(/\/+$/, "");
  const organisation = { "@type": "Organization", name: siteConfig.name, url: base };
  return {
    "@context": "https://schema.org",
    "@type": post.kind === "blog" ? "BlogPosting" : "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    mainEntityOfPage: `${base}${postPath(post.kind, post.slug)}`,
    author: organisation,
    publisher: { ...organisation, logo: { "@type": "ImageObject", url: `${base}/icon-512.png` } },
    ...(post.coverImageUrl
      ? { image: post.coverImageUrl.startsWith("/") ? `${base}${post.coverImageUrl}` : post.coverImageUrl }
      : {}),
    ...(post.category ? { articleSection: post.category } : {}),
    ...(post.tags.length > 0 ? { keywords: post.tags.join(", ") } : {}),
  };
}

export async function PostDetailPage({ kind, slug }: { kind: PostKind; slug: string }) {
  const post = await load(kind, slug);
  if (!post) notFound();

  return (
    <>
      <PostView post={post} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(post)).replace(/</g, "\\u003c") }}
      />
    </>
  );
}
