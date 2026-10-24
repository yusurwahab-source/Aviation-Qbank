import { ImageResponse } from "next/og";

import { loadContentOrThrow } from "@/content/load";
import { loadClassContentOrThrow } from "@/content/load-classes";
import { siteConfig } from "@/config/site";

export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ACCENT = "#38bdf8";
const BACKDROP = "#0a1120";
const PANEL = "#0d1424";
const BORDER = "#22304a";
const TEXT = "#e8eef7";
const MUTED = "#96a5bc";

/**
 * `public/logo-wordmark-light.svg`, inlined as a data URI: the card is
 * rendered by the build, which cannot rely on `public/` being on disk.
 */
const WORDMARK =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjcwIC04MDQgNTgzNiA5NzMiIHdpZHRoPSI1ODQiIGhlaWdodD0iOTciIHJvbGU9ImltZyIgYXJpYS1sYWJlbD0iUGlsb3RRQmFuayI+PHRpdGxlPlBpbG90UUJhbms8L3RpdGxlPjxnPjxwYXRoIGZpbGw9IiNGRkZGRkYiIGQ9Ik03MCAwVi03MDBIMzkwUTQ4NiAtNzAwIDU1NS41IC02NjlRNjI1IC02MzggNjYzIC01NzkuNVE3MDEgLTUyMSA3MDEgLTQ0MVE3MDEgLTM2MiA2NjMgLTMwNFE2MjUgLTI0NiA1NTUuNSAtMjE0LjVRNDg2IC0xODMgMzkwIC0xODNIMjY4VjBaTTI2OCAtMzM5SDM3OFE0NDAgLTMzOSA0NzAuNSAtMzY2UTUwMSAtMzkzIDUwMSAtNDQxUTUwMSAtNDkwIDQ3MC41IC01MTdRNDQwIC01NDQgMzc4IC01NDRIMjY4WiIvPjxwYXRoIGZpbGw9IiNGRkZGRkYiIGQ9Ik03OTggMFYtNTQySDk4OFYwWk04OTMgLTYwMlE4NDEgLTYwMiA4MDkgLTYzMVE3NzcgLTY2MCA3NzcgLTcwM1E3NzcgLTc0NiA4MDkgLTc3NVE4NDEgLTgwNCA4OTMgLTgwNFE5NDUgLTgwNCA5NzcgLTc3Ni41UTEwMDkgLTc0OSAxMDA5IC03MDZRMTAwOSAtNjYxIDk3Ny41IC02MzEuNVE5NDYgLTYwMiA4OTMgLTYwMloiLz48cGF0aCBmaWxsPSIjRkZGRkZGIiBkPSJNMTExMSAwVi03NDJIMTMwMVYwWiIvPjxwYXRoIGZpbGw9IiNGRkZGRkYiIGQ9Ik0xNjk2IDlRMTYwNyA5IDE1MzggLTI3UTE0NjkgLTYzIDE0MjkuNSAtMTI2LjVRMTM5MCAtMTkwIDEzOTAgLTI3MlExMzkwIC0zNTQgMTQyOS41IC00MTdRMTQ2OSAtNDgwIDE1MzggLTUxNS41UTE2MDcgLTU1MSAxNjk2IC01NTFRMTc4NSAtNTUxIDE4NTQuNSAtNTE1LjVRMTkyNCAtNDgwIDE5NjMgLTQxN1EyMDAyIC0zNTQgMjAwMiAtMjcyUTIwMDIgLTE5MCAxOTYzIC0xMjYuNVExOTI0IC02MyAxODU0LjUgLTI3UTE3ODUgOSAxNjk2IDlaTTE2OTYgLTE0MlExNzI5IC0xNDIgMTc1NC41IC0xNTdRMTc4MCAtMTcyIDE3OTUgLTIwMS41UTE4MTAgLTIzMSAxODEwIC0yNzJRMTgxMCAtMzEzIDE3OTUgLTM0MS41UTE3ODAgLTM3MCAxNzU0LjUgLTM4NVExNzI5IC00MDAgMTY5NiAtNDAwUTE2NjQgLTQwMCAxNjM4LjUgLTM4NVExNjEzIC0zNzAgMTU5Ny41IC0zNDEuNVExNTgyIC0zMTMgMTU4MiAtMjcyUTE1ODIgLTIzMSAxNTk3LjUgLTIwMS41UTE2MTMgLTE3MiAxNjM4LjUgLTE1N1ExNjY0IC0xNDIgMTY5NiAtMTQyWiIvPjxwYXRoIGZpbGw9IiNGRkZGRkYiIGQ9Ik0yMzMyIDlRMjIyOCA5IDIxNzAgLTQyLjVRMjExMiAtOTQgMjExMiAtMTk4Vi00MDFIMjAzM1YtNTQySDIxMTJWLTY2M0gyMzAyVi01NDJIMjQyNlYtNDAxSDIzMDJWLTIwMFEyMzAyIC0xNzEgMjMxOCAtMTU0LjVRMjMzNCAtMTM4IDIzNTkgLTEzOFEyMzkzIC0xMzggMjQxNyAtMTU1TDI0NjQgLTIyUTI0NDAgLTYgMjQwNSAxLjVRMjM3MCA5IDIzMzIgOVoiLz48cGF0aCBmaWxsPSIjMzhCREY4IiBkPSJNMzEyOCAxNjlRMzA4MyAxNjkgMzA0NCAxNTkuNVEzMDA1IDE1MCAyOTY3LjUgMTI5UTI5MzAgMTA4IDI4OTAgNzJRMjg1OSA0NSAyODIzIDhRMjc4MiAxIDI3NDQgLTEzUTI2NzMgLTQwIDI2MjAuNSAtODkuNVEyNTY4IC0xMzkgMjUzOSAtMjA1UTI1MTAgLTI3MSAyNTEwIC0zNTBRMjUxMCAtNDI5IDI1MzkgLTQ5NVEyNTY4IC01NjEgMjYyMC41IC02MTAuNVEyNjczIC02NjAgMjc0NCAtNjg3UTI4MTUgLTcxNCAyODk5IC03MTRRMjk4NCAtNzE0IDMwNTQuNSAtNjg3UTMxMjUgLTY2MCAzMTc3IC02MTFRMzIyOSAtNTYyIDMyNTguNSAtNDk1LjVRMzI4OCAtNDI5IDMyODggLTM1MFEzMjg4IC0yNzEgMzI1OC41IC0yMDQuNVEzMjI5IC0xMzggMzE3NyAtODlRMzEyNSAtNDAgMzA1NSAtMTNRMzA1MyAtMTIgMzA1MSAtMTJRMzA1MSAtMTEgMzA1MSAtMTFRMzA3MSAxMCAzMDkwLjUgMTlRMzExMCAyOCAzMTMyIDI4UTMxOTAgMjggMzIzOCAtMjFMMzMyNCA4MVEzMjUxIDE2OSAzMTI4IDE2OVpNMjg5OSAtMTUwUTI5MzkgLTE1MCAyOTczLjUgLTE2NFEzMDA4IC0xNzggMzAzMy41IC0yMDQuNVEzMDU5IC0yMzEgMzA3My41IC0yNjhRMzA4OCAtMzA1IDMwODggLTM1MFEzMDg4IC0zOTYgMzA3My41IC00MzIuNVEzMDU5IC00NjkgMzAzMy41IC00OTUuNVEzMDA4IC01MjIgMjk3My41IC01MzZRMjkzOSAtNTUwIDI4OTkgLTU1MFEyODU5IC01NTAgMjgyNC41IC01MzZRMjc5MCAtNTIyIDI3NjQuNSAtNDk1LjVRMjczOSAtNDY5IDI3MjQuNSAtNDMyLjVRMjcxMCAtMzk2IDI3MTAgLTM1MFEyNzEwIC0zMDUgMjcyNC41IC0yNjhRMjczOSAtMjMxIDI3NjQuNSAtMjA0LjVRMjc5MCAtMTc4IDI4MjQuNSAtMTY0UTI4NTkgLTE1MCAyODk5IC0xNTBaIi8+PHBhdGggZmlsbD0iI0ZGRkZGRiIgZD0iTTM0NDQgMFYtNzAwSDM3MzZRMzg0OSAtNzAwIDM5MTMgLTY1NFEzOTc3IC02MDggMzk3NyAtNTIxUTM5NzcgLTQ2NCAzOTUwIC00MjVRMzkyMyAtMzg2IDM4NzYgLTM2N1EzODY4IC0zNjMgMzg2MCAtMzYxUTM4ODcgLTM1NSAzOTEwIC0zNDZRMzk2MSAtMzI1IDM5ODcuNSAtMjg1UTQwMTQgLTI0NSA0MDE0IC0xODVRNDAxNCAtOTcgMzk1MCAtNDguNVEzODg2IDAgMzc1NiAwWk0zNDk1IC00NEgzNzU2UTM4NTcgLTQ0IDM5MTAgLTc4LjVRMzk2MyAtMTEzIDM5NjMgLTE4OVEzOTYzIC0yNjQgMzkxMCAtMjk4LjVRMzg1NyAtMzMzIDM3NTYgLTMzM0gzNDk1Wk0zNDk1IC0zNzdIMzczNFEzODI1IC0zNzcgMzg3NSAtNDEyUTM5MjUgLTQ0NyAzOTI1IC01MTdRMzkyNSAtNTg2IDM4NzUgLTYyMVEzODI1IC02NTYgMzczNCAtNjU2SDM0OTVaIi8+PHBhdGggZmlsbD0iI0ZGRkZGRiIgZD0iTTQ1MDkgMFYtOTRRNDQ4OCAtNTUgNDQ1MCAtMzBRNDM5OSA0IDQzMjEgNFE0MjYzIDQgNDIyMC41IC0xNC41UTQxNzggLTMzIDQxNTUuNSAtNjdRNDEzMyAtMTAxIDQxMzMgLTE0NVE0MTMzIC0xODUgNDE1MS41IC0yMTcuNVE0MTcwIC0yNTAgNDIxMyAtMjcwLjVRNDI1NiAtMjkxIDQzMjggLTI5MUg0NTA3Vi0zMzNRNDUwNyAtNDA2IDQ0NjcuNSAtNDQ0UTQ0MjggLTQ4MiA0MzUyIC00ODJRNDI5OCAtNDgyIDQyNTEuNSAtNDYzLjVRNDIwNSAtNDQ1IDQxNzIgLTQxNkw0MTQ3IC00NTJRNDE4NiAtNDg3IDQyNDEgLTUwNi41UTQyOTYgLTUyNiA0MzU2IC01MjZRNDQ1MyAtNTI2IDQ1MDUgLTQ3N1E0NTU3IC00MjggNDU1NyAtMzMxVjBaTTQ1MDcgLTI1Mkg0MzI5UTQyNDggLTI1MiA0MjE1LjUgLTIyMlE0MTgzIC0xOTIgNDE4MyAtMTQ3UTQxODMgLTk3IDQyMjEgLTY3UTQyNTkgLTM3IDQzMjggLTM3UTQzOTQgLTM3IDQ0MzkuNSAtNjdRNDQ4NSAtOTcgNDUwNyAtMTU0WiIvPjxwYXRoIGZpbGw9IiNGRkZGRkYiIGQ9Ik00NzYzIDBWLTUyMkg0ODExVi00MDlRNDgzNSAtNDYwIDQ4ODMgLTQ5MVE0OTM4IC01MjYgNTAxOCAtNTI2UTUwODIgLTUyNiA1MTI5LjUgLTUwMS41UTUxNzcgLTQ3NyA1MjAzLjUgLTQyNy41UTUyMzAgLTM3OCA1MjMwIC0zMDVWMEg1MTgwVi0zMDFRNTE4MCAtMzg5IDUxMzUuNSAtNDM1UTUwOTEgLTQ4MSA1MDExIC00ODFRNDk1MCAtNDgxIDQ5MDUgLTQ1NlE0ODYwIC00MzEgNDgzNi41IC0zODZRNDgxMyAtMzQxIDQ4MTMgLTI3OFYwWiIvPjxwYXRoIGZpbGw9IiNGRkZGRkYiIGQ9Ik01NDM2IDBWLTc0Mkg1NDg2Vi0yMTdMNTgyMCAtNTIySDU4ODRMNTY1OSAtMzExTDU5MDYgMEg1ODQ0TDU2MjIgLTI3OUw1NDg2IC0xNTVWMFoiLz48L2c+PC9zdmc+Cg==";

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

        <div style={{ display: "flex", alignItems: "center" }}>
          <img src={WORDMARK} alt="PilotQBank" width={312} height={52} />
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
