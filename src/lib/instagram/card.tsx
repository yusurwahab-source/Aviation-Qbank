import type { ReactElement } from "react";

import { siteConfig } from "@/config/site";
import {
  questionTypeSizes,
  type CardQuestion,
  type Promo,
} from "@/lib/instagram/plan";

/**
 * The pictures the Instagram agent posts, drawn with `next/og` like the
 * social card. 1080×1350 is Instagram's 4:5 portrait, the tallest a feed post
 * may be, and a carousel needs every slide the same shape.
 *
 * Hex values written by hand for the reason `opengraph-image.tsx` gives: the
 * rasteriser cannot read `globals.css`. They are the dark theme's tokens;
 * change them with the palette.
 */
export const CARD_SIZE = { width: 1080, height: 1350 } as const;

const BACKDROP = "#0a1120";
const PANEL = "#10192c";
const BORDER = "#2c3c5c";
const TEXT = "#ffffff";
const MUTED = "#a9b6cb";
const ACCENT = "#f5c542";
const ON_ACCENT = "#0a1120";
const SUCCESS = "#4ade80";

const LETTERS = ["A", "B", "C", "D", "E"];

export type CardSpec =
  | { kind: "question"; question: CardQuestion }
  | { kind: "answer"; question: CardQuestion }
  | { kind: "tip"; question: CardQuestion }
  | { kind: "promo"; promo: Promo };

function Frame({ label, children }: { label: string; children: ReactElement | ReactElement[] }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: BACKDROP,
        padding: "72px 72px 64px",
        color: TEXT,
        fontFamily: "Space Grotesk, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 700, letterSpacing: "-0.02em" }}>
          <span>Pilot</span>
          <span style={{ color: ACCENT }}>Q</span>
          <span>Bank</span>
        </div>
        <div
          style={{
            display: "flex",
            background: ACCENT,
            color: ON_ACCENT,
            borderRadius: 999,
            padding: "10px 26px",
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "0.04em",
          }}
        >
          {label}
        </div>
      </div>
      {children}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: MUTED }}>
        <span>{siteConfig.url.replace("https://", "")}</span>
        <span>Free ATPL practice</span>
      </div>
    </div>
  );
}

function Option({
  letter,
  text,
  size,
  correct,
}: {
  letter: string;
  text: string;
  size: number;
  correct?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        background: correct ? "#17402c" : PANEL,
        border: `2px solid ${correct ? SUCCESS : BORDER}`,
        borderRadius: 20,
        padding: "18px 28px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          width: size + 14,
          height: size + 14,
          borderRadius: 999,
          background: correct ? SUCCESS : BORDER,
          color: correct ? ON_ACCENT : TEXT,
          fontSize: size - 4,
          fontWeight: 700,
        }}
      >
        {letter}
      </div>
      <div style={{ display: "flex", fontSize: size, lineHeight: 1.25, fontFamily: "Inter, sans-serif" }}>
        {text}
      </div>
    </div>
  );
}

function Heading({ children }: { children: string }) {
  return (
    <div style={{ display: "flex", fontSize: 26, color: ACCENT, fontWeight: 700, letterSpacing: "0.06em" }}>
      {children.toUpperCase()}
    </div>
  );
}

export function renderCard(spec: CardSpec): ReactElement {
  if (spec.kind === "promo") {
    const { promo } = spec;
    return (
      <Frame label="STUDY SMARTER">
        <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
          <div style={{ display: "flex", fontSize: 92, fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.03em" }}>
            {promo.headline}
          </div>
          <div style={{ display: "flex", fontSize: 42, color: MUTED, lineHeight: 1.4, fontFamily: "Inter, sans-serif" }}>
            {promo.body}
          </div>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              background: ACCENT,
              color: ON_ACCENT,
              borderRadius: 20,
              padding: "20px 40px",
              fontSize: 38,
              fontWeight: 700,
            }}
          >
            Try free questions →
          </div>
        </div>
      </Frame>
    );
  }

  const q = spec.question;
  const sizes = questionTypeSizes(q);
  const label =
    spec.kind === "question" ? "QUESTION OF THE DAY" : spec.kind === "answer" ? "ANSWER" : "REVISE IT";
  const correctIndex = q.options.findIndex((option) => option.id === q.correct);
  const correct = q.options[correctIndex];

  if (spec.kind === "question") {
    return (
      <Frame label={label}>
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          <Heading>{`${q.subjectName} · ${q.topic}`}</Heading>
          <div
            style={{
              display: "flex",
              fontSize: sizes.question,
              fontWeight: 700,
              lineHeight: 1.25,
              fontFamily: "Inter, sans-serif",
            }}
          >
            {q.question}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {q.options.map((option, i) => (
              <Option key={option.id} letter={LETTERS[i]} text={option.text} size={sizes.option} />
            ))}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: ACCENT, fontWeight: 700 }}>
          Comment your answer · swipe for the solution →
        </div>
      </Frame>
    );
  }

  return (
    <Frame label={label}>
      <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
        <Heading>{`${q.subjectName} · ${q.topic}`}</Heading>
        {spec.kind === "tip" ? (
          <div style={{ display: "flex", fontSize: 38, fontWeight: 700, lineHeight: 1.25, fontFamily: "Inter, sans-serif" }}>
            {q.question}
          </div>
        ) : null}
        {correct ? (
          <Option letter={LETTERS[correctIndex]} text={correct.text} size={sizes.option} correct />
        ) : null}
        <div style={{ display: "flex", fontSize: 36, color: MUTED, lineHeight: 1.45, fontFamily: "Inter, sans-serif" }}>
          {q.explanation}
        </div>
      </div>
    </Frame>
  );
}
