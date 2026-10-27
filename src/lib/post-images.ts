/**
 * Uploaded cover images for Blog posts and Articles: the rules, with no
 * database and no React. Pure and unit tested, like `posts.ts`.
 *
 * An uploaded image is stored in the database (`post_images`) and served by
 * `/api/post-images/<id>`; that path is what goes in the post's
 * `coverImageUrl`, so every existing page, card and metadata tag that
 * already renders a cover renders an uploaded one with no change.
 */

/**
 * 4 MB. Vercel rejects a serverless request body over 4.5 MB before the
 * route runs, so a larger limit here would promise something the host
 * cannot deliver.
 */
export const MAX_POST_IMAGE_BYTES = 4 * 1024 * 1024;

export const POST_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type PostImageType = (typeof POST_IMAGE_TYPES)[number];

/** The `accept` attribute for the file picker. The server does not trust it. */
export const POST_IMAGE_ACCEPT = POST_IMAGE_TYPES.join(",");

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const UPLOADED_PATH = new RegExp(`^/api/post-images/(${UUID})$`, "i");

export function postImageUrl(id: string): string {
  return `/api/post-images/${id}`;
}

/** The image id if `url` is one of our uploads, else null (a link, a site path). */
export function uploadedImageId(url: string | null | undefined): string | null {
  const match = url ? UPLOADED_PATH.exec(url) : null;
  return match ? match[1].toLowerCase() : null;
}

/**
 * What a file really is, from its first bytes — never from the file name
 * or the type the browser claimed. SVG is deliberately not accepted: it can
 * carry script. HEIC and GIF are refused too.
 */
export function sniffPostImageType(bytes: Uint8Array): PostImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte)
  ) {
    return "image/png";
  }
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

export type PostImageCheck =
  | { ok: true; contentType: PostImageType }
  | { ok: false; status: 400 | 413 | 415; error: string };

/** Size and real format of an upload. */
export function checkPostImage(bytes: Uint8Array): PostImageCheck {
  if (bytes.length === 0) return { ok: false, status: 400, error: "That file is empty." };
  if (bytes.length > MAX_POST_IMAGE_BYTES) {
    return { ok: false, status: 413, error: "That image is larger than 4 MB. Choose a smaller one." };
  }
  const contentType = sniffPostImageType(bytes);
  if (!contentType) {
    return { ok: false, status: 415, error: "Upload a JPEG, PNG or WebP image." };
  }
  return { ok: true, contentType };
}

const EXTENSION: Record<PostImageType, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/**
 * A file name that is safe to keep and to show: the user's name with any
 * path removed, reduced to letters, digits, dots, hyphens and underscores,
 * and given the extension of the *detected* type. It is only ever a label —
 * the stored image is addressed by its random id, never by this name.
 */
export function safeImageName(original: string, contentType: PostImageType): string {
  const base = original.split(/[\\/]/).pop() ?? "";
  const stem = base
    .replace(/\.[^.]*$/, "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${stem === "" ? "image" : stem}.${EXTENSION[contentType]}`;
}
