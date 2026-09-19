import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";

/**
 * Draws every raster form of the logo mark from one definition.
 *
 * Run with `npm run icons:generate`. The outputs are committed, so this is
 * not part of the build — a deploy must never depend on rasterising
 * anything. Re-run it when the mark or the brand colours change.
 *
 * The mark itself lives in `src/components/logo.tsx` as a React component
 * for the application, and is repeated here as a string because this script
 * hands SVG to a rasteriser rather than to React. The two are the same four
 * lines and one arc; if one changes, change the other.
 */

const ACCENT = "#3ab7cc";
const BACKDROP = "#0b1220";

const OUT_DIR = path.join(process.cwd(), "public");
const APP_DIR = path.join(process.cwd(), "src", "app");

function markSvg(color: string): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">`,
    `<path d="M8.54 5.35A13 13 0 1 0 23.46 5.35" fill="none" stroke="${color}"`,
    ` stroke-width="2" stroke-linecap="round" opacity="0.38"/>`,
    `<path d="M16 3.2 24 24 16 19.4 8 24Z" fill="${color}"/>`,
    `</svg>`,
  ].join("");
}

function markDataUri(color: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(markSvg(color)).toString("base64")}`;
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
        <img src={markDataUri(ACCENT)} width={markSize} height={markSize} alt="" />
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

  const [icon192, icon512, maskable512, apple180, ico32, ico16] = await Promise.all([
    squareIcon(192, 0.18, true),
    squareIcon(512, 0.18, true),
    // Wider margin: a launcher mask crops this one.
    squareIcon(512, 0.28, false),
    // Apple adds its own rounded corners and never a background, so this one
    // is drawn square and edge to edge.
    squareIcon(180, 0.16, false),
    squareIcon(32, 0.08, false),
    squareIcon(16, 0.04, false),
  ]);

  const written: [string, Buffer][] = [
    // The manifest's icons need stable URLs, so they are plain public files.
    [path.join(OUT_DIR, "icon-192.png"), icon192],
    [path.join(OUT_DIR, "icon-512.png"), icon512],
    [path.join(OUT_DIR, "icon-maskable-512.png"), maskable512],
    // This one is a Next.js file convention: putting it in `app/` is what
    // emits the `apple-touch-icon` link, with the right size on it.
    [path.join(APP_DIR, "apple-icon.png"), apple180],
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
