"use client";

import { useState } from "react";

import { fieldKind, type RowField } from "@/lib/logbook/model";
import { formatClock, formatDuration, parseClock, parseCount, parseDuration } from "@/lib/logbook/time";
import type { Severity } from "@/lib/logbook/validate";

export type CellMark = { severity: Exclude<Severity, "info"> | null; doubtful: boolean };

function display(field: RowField, value: number | string | null): string {
  if (value === null) return "";
  if (typeof value === "string") return value;
  const kind = fieldKind(field);
  if (kind === "duration") return formatDuration(value);
  if (kind === "clock") return formatClock(value);
  return String(value);
}

function parse(field: RowField, text: string): { ok: true; value: number | string | null } | { ok: false } {
  const trimmed = text.trim();
  if (trimmed === "") return { ok: true, value: null };
  const kind = fieldKind(field);
  if (kind === "text") return { ok: true, value: trimmed.slice(0, 500) };
  const value = kind === "duration" ? parseDuration(trimmed) : kind === "clock" ? parseClock(trimmed) : parseCount(trimmed);
  return value === null ? { ok: false } : { ok: true, value };
}

const WIDTH: Record<ReturnType<typeof fieldKind>, string> = {
  duration: "w-16",
  clock: "w-14",
  count: "w-10",
  text: "w-24",
};

/**
 * One editable cell. Holds its own draft while focused and commits on blur
 * or Enter, so typing "1:3" on the way to "1:30" never runs the checks on a
 * half-typed number. A draft that will not parse stays on screen, outlined,
 * rather than being thrown away.
 */
export function CellInput({
  id,
  field,
  value,
  mark,
  label,
  onCommit,
  wide = false,
}: {
  id: string;
  field: RowField;
  value: number | string | null;
  mark: CellMark;
  label: string;
  onCommit: (value: number | string | null) => void;
  wide?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const shown = draft ?? display(field, value);

  const commit = () => {
    if (draft === null) return;
    const parsed = parse(field, draft);
    if (!parsed.ok) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setDraft(null);
    if (parsed.value !== value) onCommit(parsed.value);
  };

  const tone = invalid || mark.severity === "error"
    ? "border-incorrect bg-incorrect-soft"
    : mark.severity === "warning"
      ? "border-warning bg-warning-soft"
      : "border-transparent bg-transparent";

  return (
    <input
      id={id}
      aria-label={label}
      aria-invalid={invalid || mark.severity === "error" || undefined}
      inputMode={fieldKind(field) === "text" ? "text" : "decimal"}
      value={shown}
      onChange={(event) => {
        setDraft(event.target.value);
        setInvalid(false);
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") (event.target as HTMLInputElement).blur();
        if (event.key === "Escape") {
          setDraft(null);
          setInvalid(false);
        }
      }}
      title={invalid ? "This value could not be read" : undefined}
      className={`h-9 rounded border px-1.5 text-xs text-foreground focus:border-brand focus:bg-surface focus:outline-none ${
        wide ? "w-40" : WIDTH[fieldKind(field)]
      } ${tone} ${mark.doubtful ? "underline decoration-dotted decoration-2 underline-offset-4" : ""}`}
    />
  );
}
