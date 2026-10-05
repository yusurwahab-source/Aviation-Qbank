import type { ImageMediaType } from "./claude";

/**
 * What an uploaded file really is, from its first bytes — never from the
 * name or the type the browser claimed. Pure and tested.
 *
 * HEIC is recognised only to be refused with a useful message: the model
 * cannot read it, and the browser is expected to have converted it already
 * (`compress-image.ts`).
 */
export function sniffImageType(bytes: Uint8Array): ImageMediaType | "heic" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a
  ) {
    return "image/png";
  }
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (bytes.length >= 12 && ascii(4, 8) === "ftyp" && /^(heic|heix|hevc|heim|heis|mif1|msf1)$/.test(ascii(8, 12))) {
    return "heic";
  }
  return null;
}
