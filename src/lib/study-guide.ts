import "server-only";

import { existsSync } from "node:fs";
import path from "node:path";

/**
 * A study guide is one self-contained HTML file dropped in `public/`, named
 * `<code>-study-guide.html` — the same content-only convention a question
 * file already follows. Nothing requires one to exist for a given aircraft,
 * class rating or Flying Knowledge subject; an overview page just checks and
 * links to it when it does, so adding a guide for the next aircraft is
 * dropping the file in `public/` and nothing else.
 */
export function studyGuideHref(code: string): string | null {
  const file = `${code.toLowerCase()}-study-guide.html`;
  return existsSync(path.join(process.cwd(), "public", file)) ? `/${file}` : null;
}
