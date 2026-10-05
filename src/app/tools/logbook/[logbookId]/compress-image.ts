/**
 * Prepares one phone photo for upload, entirely in the browser: decoded with
 * its EXIF orientation applied, scaled so the long side is at most 2000px,
 * and re-encoded as JPEG. That keeps an upload to a few hundred kilobytes —
 * under the hosting platform's request limit, and the size the model reads
 * best at — and turns an iPhone's HEIC into something the server can use.
 */

export const MAX_DIMENSION = 2000;
/** Comfortably under the 4.5 MB request body a serverless function accepts. */
const TARGET_BYTES = 3_500_000;

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  try {
    // `from-image` applies the EXIF rotation, so a photo taken sideways
    // arrives the right way up.
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Safari decodes HEIC through <img> where createImageBitmap may not;
    // <img> applies EXIF orientation by default too.
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.decoding = "async";
      image.src = url;
      await image.decode();
      return image;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

export async function compressImage(file: File): Promise<Blob> {
  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await decode(file);
  } catch {
    throw new Error(
      /hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)
        ? "This browser can't open HEIC photos. On iPhone, set Settings › Camera › Formats › Most Compatible, or upload the photo from Safari."
        : "This photo could not be opened. Try a JPEG or PNG.",
    );
  }

  const width = "naturalWidth" in source ? source.naturalWidth : source.width;
  const height = "naturalHeight" in source ? source.naturalHeight : source.height;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot prepare photos for upload.");
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  if ("close" in source) source.close();

  for (const quality of [0.85, 0.75, 0.6]) {
    const blob = await toBlob(canvas, quality);
    if (blob && blob.size <= TARGET_BYTES) return blob;
  }
  throw new Error("This photo is too large to upload, even compressed.");
}
