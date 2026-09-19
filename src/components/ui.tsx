import type { ReactNode } from "react";


/** Small shared building blocks, kept in one file while the app is this small. */

export function PageHeading({
  title,
  subtitle,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}) {
  return (
    <div className="mb-6">
      {eyebrow ? (
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h1>
      {subtitle ? <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-surface p-5 ${className}`}>{children}</div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "correct" | "incorrect" | "warning" | "flag";
}) {
  const tones = {
    neutral: "bg-surface-muted text-muted-foreground",
    brand: "bg-brand-soft text-brand",
    correct: "bg-correct-soft text-correct",
    incorrect: "bg-incorrect-soft text-incorrect",
    warning: "bg-warning-soft text-warning",
    flag: "bg-flag-soft text-flag",
  } as const;

  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** A labelled horizontal bar. Used for per-topic scores. */
export function ScoreBar({ percentage, tone = "brand" }: { percentage: number; tone?: "brand" | "score" }) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const color =
    tone === "brand"
      ? "bg-brand"
      : clamped >= 80
        ? "bg-correct"
        : clamped >= 50
          ? "bg-brand"
          : "bg-incorrect";

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Card className="text-center">
      <p className="font-medium text-foreground">{title}</p>
      {children ? <div className="mt-2 text-sm text-muted-foreground">{children}</div> : null}
    </Card>
  );
}
