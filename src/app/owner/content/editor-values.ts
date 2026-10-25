import type { Post } from "@/db/schema";
import { formatReferences, type PostKind } from "@/lib/posts";

import type { EditorValues } from "./post-editor";

/** A stored post as the editor's form values (or a blank one for a new post). */
export function editorValues(post: Post | null, kind: PostKind): EditorValues {
  if (!post) {
    return {
      kind,
      title: "",
      slug: "",
      excerpt: "",
      body: "",
      coverImageUrl: "",
      coverImageAlt: "",
      category: "",
      tags: "",
      references: "",
      sourceName: "",
      sourceUrl: "",
      sourcePublishedOn: "",
      publishedOn: "",
      featured: false,
      seoTitle: "",
      seoDescription: "",
    };
  }
  return {
    kind: post.kind,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    body: post.body,
    coverImageUrl: post.coverImageUrl ?? "",
    coverImageAlt: post.coverImageAlt ?? "",
    category: post.category ?? "",
    tags: post.tags.join(", "),
    references: formatReferences(post.references),
    sourceName: post.sourceName ?? "",
    sourceUrl: post.sourceUrl ?? "",
    sourcePublishedOn: post.sourcePublishedOn ?? "",
    publishedOn: post.publishedAt ? post.publishedAt.toISOString().slice(0, 10) : "",
    featured: post.featured,
    seoTitle: post.seoTitle ?? "",
    seoDescription: post.seoDescription ?? "",
  };
}
