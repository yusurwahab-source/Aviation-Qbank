import { getPostImage } from "@/db/post-images";

/**
 * Serves an uploaded cover image. Public, like the posts it illustrates;
 * the id is a random UUID, so a draft's picture is not guessable. The type
 * sent is the one detected from the bytes at upload, `nosniff` stops a
 * browser second-guessing it, and the sandboxing CSP keeps the response
 * inert even if someone opens it directly. Content never changes for a
 * given id (a replacement is a new id), so it caches for a year.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });

  const image = await getPostImage(id.toLowerCase());
  if (!image) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.contentType,
      "Content-Length": String(image.data.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cross-Origin-Resource-Policy": "cross-origin",
    },
  });
}
