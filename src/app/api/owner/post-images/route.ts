import { writeAuditLog } from "@/db/audit-log";
import { deleteStalePostImages, insertPostImage } from "@/db/post-images";
import { isOwner } from "@/lib/auth/owner";
import { getCurrentUser } from "@/lib/auth/session";
import { envValue } from "@/lib/env";
import { MAX_POST_IMAGE_BYTES, checkPostImage, safeImageName } from "@/lib/post-images";

/**
 * One cover image in, its public path out — for the owner's Blog and
 * Articles editor.
 *
 * A route handler rather than a server action, because a server action's
 * request body is capped at 1 MB by default and an image is bigger. It
 * keeps the owner gate's temperament, though: anyone but the owner gets the
 * same plain 404 as `/owner`, never a hint that the path exists. The
 * format is decided from the file's own bytes, the size is checked twice
 * (the declared length before reading, the real length after), and the
 * client's file name is reduced to a label — it never names anything.
 */

export const dynamic = "force-dynamic";

const json = (status: number, body: Record<string, unknown>) => Response.json(body, { status });

export async function POST(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user || !isOwner(user.email, envValue("OWNER_EMAIL"))) {
    return new Response("Not found", { status: 404 });
  }

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_POST_IMAGE_BYTES + 64 * 1024) {
    return json(413, { ok: false, error: "That image is larger than 4 MB. Choose a smaller one." });
  }

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("image");
  } catch {
    return json(400, { ok: false, error: "The upload could not be read." });
  }
  if (!(file instanceof Blob)) return json(400, { ok: false, error: "Choose an image to upload." });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const checked = checkPostImage(bytes);
  if (!checked.ok) return json(checked.status, { ok: false, error: checked.error });

  const originalName = file instanceof File ? file.name : "";
  const fileName = safeImageName(originalName, checked.contentType);

  try {
    const image = await insertPostImage({
      contentType: checked.contentType,
      data: Buffer.from(bytes),
      fileName,
      uploadedBy: user.email,
    });
    await writeAuditLog({
      actorEmail: user.email,
      action: "post.image.upload",
      targetType: "post_image",
      targetId: image.id,
      metadata: { fileName, contentType: checked.contentType, bytes: bytes.length },
    });
    // Tidy-up that must never fail an upload that already succeeded.
    await deleteStalePostImages().catch((error) => console.error("Stale image sweep failed:", error));
    return json(200, { ok: true, url: image.url, fileName, bytes: bytes.length });
  } catch (error) {
    console.error("Cover image upload failed:", error);
    return json(500, { ok: false, error: "The image could not be saved. Please try again." });
  }
}
