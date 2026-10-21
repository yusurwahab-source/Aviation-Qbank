/**
 * The two faces the cards use, fetched as TTF — the only format the
 * rasteriser reads. Every failure returns nothing and the card falls back to
 * the bundled sans: a picture in the wrong font is a smaller problem than a
 * post that did not go out because a font server was slow. Same approach as
 * `opengraph-image.tsx`.
 */
async function googleFont(family: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&display=swap`,
      { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1; rv:6.0) Gecko/20110814" } },
    ).then((response) => (response.ok ? response.text() : ""));

    const url = css.match(/src:\s*url\((https:\/\/[^)]+\.ttf)\)/)?.[1];
    if (!url) return null;

    const font = await fetch(url);
    return font.ok ? await font.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export type CardFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700;
  style: "normal";
};

export async function cardFonts(): Promise<CardFont[]> {
  const [display, reading, readingBold] = await Promise.all([
    googleFont("Space+Grotesk", 700),
    googleFont("Inter", 400),
    googleFont("Inter", 700),
  ]);

  const fonts: CardFont[] = [];
  if (display) fonts.push({ name: "Space Grotesk", data: display, weight: 700, style: "normal" });
  if (reading) fonts.push({ name: "Inter", data: reading, weight: 400, style: "normal" });
  if (readingBold) fonts.push({ name: "Inter", data: readingBold, weight: 700, style: "normal" });
  return fonts;
}
