import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";

/**
 * Draws every raster form of the favicon — a yellow Q on black — from
 * `public/favicon.svg`, which is the one definition.
 *
 * Run with `npm run icons:generate`. The outputs are committed, so this is
 * not part of the build — a deploy must never depend on rasterising
 * anything. Re-run it when the mark or the brand colours change.
 *
 * The Q's outline is read out of `public/favicon.svg`, so the icons can
 * never drift from it.
 */

const BACKDROP = "#000000";

const OUT_DIR = path.join(process.cwd(), "public");
const APP_DIR = path.join(process.cwd(), "src", "app");

/**
 * Just the Q, in a viewBox cut tight around it (the favicon's 64-unit
 * square, centred on 32,32, with the glyph 40 units tall) so that the size
 * an icon draws it at is the size of the letter itself.
 */
async function markDataUri(): Promise<string> {
  const favicon = await readFile(path.join(OUT_DIR, "favicon.svg"), "utf8");
  const d = favicon.match(/<path fill="#38BDF8" d="([^"]+)"/)?.[1];
  if (!d) throw new Error("public/favicon.svg has no Q path");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="12 12 40 40" width="40" height="40"><path fill="#38BDF8" d="${d}"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/**
 * One square icon.
 *
 * `inset` is the share of the canvas left empty around the mark. A launcher
 * that applies its own mask — Android's adaptive icons — crops to a circle
 * inscribed in the square and can clip anything outside the middle 80%, so a
 * maskable icon needs a wider margin than one that is shown as drawn.
 */
async function squareIcon(size: number, inset: number, rounded: boolean): Promise<Buffer> {
  const mark = await markDataUri();
  const markSize = Math.round(size * (1 - inset * 2));

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BACKDROP,
          borderRadius: rounded ? `${Math.round(size * 0.22)}px` : 0,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mark} width={markSize} height={markSize} alt="" />
      </div>
    ),
    { width: size, height: size },
  );

  return Buffer.from(await image.arrayBuffer());
}

/**
 * Wraps PNGs in an ICO container.
 *
 * `favicon.ico` is the one icon Next.js cannot generate from code — it has
 * to be a real file in `app/` — so it is assembled here. ICO has allowed a
 * PNG payload rather than a bitmap since Windows Vista, which is what lets
 * one 16px and one 32px image be written without a BMP encoder in between.
 */
function icoFrom(images: { size: number; png: Buffer }[]): Buffer {
  const HEADER = 6;
  const ENTRY = 16;

  const header = Buffer.alloc(HEADER);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(images.length, 4);

  let offset = HEADER + ENTRY * images.length;

  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(ENTRY);
    // 0 means 256 in this field; no icon here is that large.
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // palette size: none
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map((image) => image.png)]);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const [icon192, icon512, maskable512, apple180, ico32, ico16, favicon32] = await Promise.all([
    squareIcon(192, 0.18, true),
    squareIcon(512, 0.18, true),
    // Wider margin: a launcher mask crops this one.
    squareIcon(512, 0.28, false),
    // Apple adds its own rounded corners and never a background, so this one
    // is drawn square and edge to edge.
    squareIcon(180, 0.16, false),
    squareIcon(32, 0.08, false),
    squareIcon(16, 0.04, false),
    // The standalone 32px PNG keeps the favicon's rounded corners.
    squareIcon(32, 0.16, true),
  ]);

  const written: [string, Buffer][] = [
    // The manifest's icons need stable URLs, so they are plain public files.
    [path.join(OUT_DIR, "icon-192.png"), icon192],
    [path.join(OUT_DIR, "icon-512.png"), icon512],
    [path.join(OUT_DIR, "icon-maskable-512.png"), maskable512],
    // Linked from `layout.tsx`'s `icons`, not by file convention.
    [path.join(OUT_DIR, "apple-touch-icon.png"), apple180],
    [path.join(OUT_DIR, "favicon-32x32.png"), favicon32],
    [path.join(APP_DIR, "favicon.ico"), icoFrom([
      { size: 16, png: ico16 },
      { size: 32, png: ico32 },
    ])],
  ];

  for (const [file, data] of written) {
    await writeFile(file, data);
    console.log(`${path.relative(process.cwd(), file)}  ${data.length} bytes`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
