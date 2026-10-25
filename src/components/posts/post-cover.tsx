import type { ReactNode } from "react";

import type { PostKind } from "@/lib/posts";

/**
 * A post's 16:9 cover: the owner's image when the post has one, otherwise
 * the section's own quiet default — a tinted panel with the section's icon.
 * Owner-supplied images can come from any https host, so this is a plain
 * `<img>` (lazy, no referrer) rather than next/image, which would need every
 * host listed in `next.config.ts`.
 *
 * When the owner's default Blog and Articles photographs exist, they go in
 * `public/images/` and their paths in `DEFAULT_COVERS` below.
 */
const DEFAULT_COVERS: Record<PostKind, { src: string; alt: string } | null> = {
  blog: null,
  article: null,
};

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
  className: "h-9 w-9",
} as const;

const ICONS: Record<PostKind, ReactNode> = {
  blog: (
    <svg {...ICON_PROPS}>
      <path d="M4 5h16v14H4z" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </svg>
  ),
  article: (
    <svg {...ICON_PROPS}>
      <path d="M4 5.5c2.2-1 4.8-1 7 0v12.8c-2.2-1-4.8-1-7 0V5.5Z" />
      <path d="M20 5.5c-2.2-1-4.8-1-7 0v12.8c2.2-1 4.8-1 7 0V5.5Z" />
    </svg>
  ),
};

export function PostCover({
  kind,
  src,
  alt,
  eager = false,
  className = "",
}: {
  kind: PostKind;
  src: string | null;
  alt: string | null;
  /** True only for the one image at the top of a post page. */
  eager?: boolean;
  className?: string;
}) {
  const image = src ? { src, alt: alt ?? "" } : DEFAULT_COVERS[kind];

  return (
    <div className={`relative aspect-video w-full overflow-hidden bg-surface-muted ${className}`}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- owner-supplied URLs from any host
        <img
          src={image.src}
          alt={image.alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-brand-soft text-brand-ink">
          {ICONS[kind]}
        </div>
      )}
    </div>
  );
}
