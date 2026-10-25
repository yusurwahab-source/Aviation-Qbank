import Link from "next/link";

import { PostCard } from "@/components/posts/post-card";
import { listLatestPosts, type PostSummary } from "@/db/posts";
import { POST_KIND_PATH, type PostKind } from "@/lib/posts";

import { SectionHeading } from "./section-heading";

/**
 * "Latest from the Blog" and "Featured Articles" on the homepage: up to
 * three published posts each, newest first (featured Articles first).
 *
 * A section with nothing published is simply absent — the homepage never
 * shows an empty shelf or a placeholder post — and a database failure
 * hides both rather than taking the page down.
 */

const COPY: Record<PostKind, { eyebrow: string; title: string; all: string }> = {
  blog: { eyebrow: "Blog", title: "Latest from the Blog", all: "All blog posts" },
  article: { eyebrow: "Articles", title: "Featured Articles", all: "All articles" },
};

const PREVIEW_COUNT = 3;

async function load(kind: PostKind): Promise<PostSummary[]> {
  try {
    return await listLatestPosts(kind, PREVIEW_COUNT);
  } catch (error) {
    console.error(`Homepage ${kind} preview failed:`, error);
    return [];
  }
}

function Shelf({ kind, posts }: { kind: PostKind; posts: PostSummary[] }) {
  const copy = COPY[kind];
  return (
    <section aria-labelledby={`latest-${kind}`}>
      <div id={`latest-${kind}`}>
        <SectionHeading eyebrow={copy.eyebrow} title={copy.title} />
      </div>
      <ul
        className={`mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-6 ${
          posts.length >= 3 ? "sm:grid-cols-2 lg:grid-cols-3" : posts.length === 2 ? "sm:grid-cols-2" : "max-w-md"
        }`}
      >
        {posts.map((post) => (
          <li key={post.id}>
            <PostCard post={post} />
          </li>
        ))}
      </ul>
      <p className="mt-6 text-center">
        <Link href={POST_KIND_PATH[kind]} className="link-standalone text-sm font-semibold text-brand-ink hover:underline">
          {copy.all} →
        </Link>
      </p>
    </section>
  );
}

export async function LatestPosts() {
  const [blog, articles] = await Promise.all([load("blog"), load("article")]);
  if (blog.length === 0 && articles.length === 0) return null;

  return (
    <>
      {blog.length > 0 ? <Shelf kind="blog" posts={blog} /> : null}
      {articles.length > 0 ? <Shelf kind="article" posts={articles} /> : null}
    </>
  );
}
