import { ImageResponse } from "next/og";

import { loadContentOrThrow } from "@/content/load";
import { loadClassContentOrThrow } from "@/content/load-classes";
import { siteConfig } from "@/config/site";

export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ACCENT = "#3ab7cc";
const BACKDROP = "#080c14";
const PANEL = "#0f1622";
const BORDER = "#243044";
const TEXT = "#e8eef7";
const MUTED = "#96a5bc";

/**
 * What the card says about the bank.
 *
 * Read from the content files rather than written down here, so the number
 * on a shared link is the number a student will actually find. Only
 * published questions count — the same rule the application itself applies
 * everywhere else. Both content trees are read and summed — type ratings
 * and class ratings alike — so the card reports the whole bank rather than
 * one section of it; see the note on the three sections in `CLAUDE.md`.
 *
 * A failure is swallowed on purpose. This is a picture; a malformed
 * question file should fail `validate:content` and stop the build there,
 * with a message naming the file, rather than fail here with a stack trace
 * about an image.
 */
function bank(): { questions: number; types: string[] } {
  try {
    const aircraft = loadContentOrThrow();
    const classes = loadClassContentOrThrow();
    const entries = [...aircraft, ...classes];

    return {
      questions: entries.reduce(
        (total, entry) =>
          total + entry.questions.filter((question) => question.status === "published").length,
        0,
      ),
      types: entries
        .filter((entry) => entry.manifest.status === "active")
        .map((entry) => entry.manifest.code),
    };
  } catch {
    return { questions: 0, types: [] };
  }
}

/**
 * The display face, fetched as TTF because that is what the rasteriser can
 * read — `woff2` is not supported, and Google only serves the older format
 * to a client that claims not to understand the newer one, which is what
 * the user agent below is doing.
 *
 * Every failure falls back to the bundled default face. A social card in
 * the wrong font is a much smaller problem than a deploy that will not
 * build because a font server was slow.
 */
async function displayFont(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&display=swap",
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

export default async function Image() {
  const { questions, types } = bank();
  const font = await displayFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BACKDROP,
          padding: "72px 80px",
          color: TEXT,
          fontFamily: font ? "Space Grotesk" : "sans-serif",
        }}
      >
        {/* A horizon line, which is the whole of the decoration. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 315,
            height: 1,
            background: BORDER,
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="64" height="64" viewBox="0 0 32 32">
            <path
              d="M8.54 5.35A13 13 0 1 0 23.46 5.35"
              fill="none"
              stroke={ACCENT}
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.38"
            />
            <path d="M16 3.2 24 24 16 19.4 8 24Z" fill={ACCENT} />
          </svg>
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-0.02em" }}>
            {siteConfig.name}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              maxWidth: 900,
            }}
          >
            {siteConfig.tagline}
          </div>
          <div style={{ fontSize: 30, color: MUTED, maxWidth: 860, lineHeight: 1.4 }}>
            Practise by section, sit it as a timed exam, and see exactly which topics are
            costing you marks.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {questions > 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: PANEL,
                border: `1px solid ${BORDER}`,
                borderRadius: 999,
                padding: "12px 26px",
                fontSize: 28,
                fontWeight: 700,
                color: ACCENT,
              }}
            >
              {questions.toLocaleString("en-GB")} questions
            </div>
          ) : null}
          {types.map((code) => (
            <div
              key={code}
              style={{
                display: "flex",
                alignItems: "center",
                background: PANEL,
                border: `1px solid ${BORDER}`,
                borderRadius: 999,
                padding: "12px 26px",
                fontSize: 28,
                color: MUTED,
              }}
            >
              {code}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font
        ? [{ name: "Space Grotesk", data: font, style: "normal", weight: 700 }]
        : undefined,
    },
  );
}
