import Markdown, { type Components } from "react-markdown";

import { isExternalUrl, safeMarkdownUrl } from "@/lib/posts";

/**
 * A post's Markdown, rendered safely.
 *
 * react-markdown builds React elements from the Markdown syntax tree and
 * never injects HTML: raw HTML in the text is shown as text, because no
 * raw-HTML plugin is installed — and none should be. Every link and image
 * address goes through `safeMarkdownUrl` (https, mailto, site paths and
 * anchors only). External links open in a new tab with `noopener
 * noreferrer`; images load lazily and send no referrer.
 *
 * Headings shift down one level: the page's own title is the only `<h1>`,
 * so a `#` in the text becomes an `<h2>`.
 */
const components: Components = {
  h1: ({ children }) => <h2>{children}</h2>,
  h2: ({ children }) => <h3>{children}</h3>,
  h3: ({ children }) => <h4>{children}</h4>,
  a: ({ href, children }) => {
    if (!href) return <span>{children}</span>;
    return isExternalUrl(href) ? (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ) : (
      <a href={href}>{children}</a>
    );
  },
  img: ({ src, alt }) => {
    if (typeof src !== "string" || src === "") return null;
    return (
      // eslint-disable-next-line @next/next/no-img-element -- owner-supplied URLs from any host
      <img src={src} alt={alt ?? ""} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
    );
  },
};

export function PostBody({ markdown }: { markdown: string }) {
  return (
    <div className="post-prose">
      <Markdown urlTransform={safeMarkdownUrl} components={components}>
        {markdown}
      </Markdown>
    </div>
  );
}
