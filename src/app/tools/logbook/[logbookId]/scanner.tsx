"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { LogbookPage } from "@/lib/logbook/model";
import type { SavedSpread } from "@/lib/logbook/saved";
import { validateLogbook } from "@/lib/logbook/validate";

import { saveLogbookAction, unlockLogbookAction } from "../actions";
import { LogbookPrivacyNotice } from "../privacy-notice";
import { compressImage } from "./compress-image";
import { Results } from "./results";
import { ReviewPage } from "./review";

/** One scanned spread: the page as now reviewed, the page as first read
 * (what the paper says — the fix guide diffs against it), its photo while
 * this tab is open, and the student's own marks on it. */
export type Spread = {
  key: string;
  page: LogbookPage;
  original: LogbookPage;
  photoUrl: string | null;
  note: string | null;
  done: boolean;
  ignored: string[];
};

type Upload = {
  key: string;
  file: File;
  name: string;
  status: "queued" | "working" | "error";
  error?: string;
  /** Refused for want of allowance — retried after an unlock. */
  blocked?: boolean;
};

type Tab = "photos" | "review" | "results";

function newKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function LogbookScanner(props: {
  logbookId: string;
  initialName: string;
  initialSpreads: SavedSpread[];
  initialSavedAt: string | null;
  unlocked: boolean;
  spreadsRemaining: number;
  availableUnlocks: number;
  configured: boolean;
  priceLabel: string | null;
}) {
  const [name, setName] = useState(props.initialName);
  const [spreads, setSpreads] = useState<Spread[]>(() =>
    props.initialSpreads.map((spread) => ({ ...spread, photoUrl: null })),
  );
  const [uploads, setUploads] = useState<Upload[]>([]);
  const uploadsRef = useRef<Upload[]>([]);
  const processing = useRef(false);
  const [tab, setTab] = useState<Tab>(props.initialSpreads.length > 0 ? "review" : "photos");
  const [selected, setSelected] = useState(0);
  const [remaining, setRemaining] = useState(props.spreadsRemaining);
  const [unlocked, setUnlocked] = useState(props.unlocked);
  const [unlocks, setUnlocks] = useState(props.availableUnlocks);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<{ savedAt: string | null; error?: string; saving?: boolean }>({
    savedAt: props.initialSavedAt,
  });

  const result = useMemo(() => validateLogbook(spreads.map((spread) => spread.page)), [spreads]);
  const visibleCounts = useMemo(() => {
    const counts = { error: 0, warning: 0 };
    for (const finding of result.findings) {
      if (finding.severity === "info") continue;
      if (spreads[finding.page]?.ignored.includes(finding.key)) continue;
      counts[finding.severity] += 1;
    }
    return counts;
  }, [result, spreads]);

  // Object URLs live as long as this tab's view of the logbook, no longer.
  const photoUrls = useRef<string[]>([]);
  useEffect(() => {
    const urls = photoUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const working = uploads.some((upload) => upload.status === "queued" || upload.status === "working");
  useEffect(() => {
    if (!dirty && !working) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, working]);

  const updateUploads = useCallback((fn: (list: Upload[]) => Upload[]) => {
    uploadsRef.current = fn(uploadsRef.current);
    setUploads(uploadsRef.current);
  }, []);

  const changeSpreads = useCallback((fn: (list: Spread[]) => Spread[]) => {
    setSpreads(fn);
    setDirty(true);
  }, []);

  const processQueue = useCallback(async () => {
    if (processing.current) return;
    processing.current = true;
    try {
      for (;;) {
        const next = uploadsRef.current.find((upload) => upload.status === "queued");
        if (!next) break;
        updateUploads((list) => list.map((u) => (u.key === next.key ? { ...u, status: "working", error: undefined } : u)));

        try {
          const blob = await compressImage(next.file);
          const body = new FormData();
          body.append("logbookId", props.logbookId);
          body.append("image", blob, "spread.jpg");
          const response = await fetch("/api/logbook/extract", { method: "POST", body });
          const json = (await response.json().catch(() => null)) as
            | { ok: true; page: LogbookPage; note: string | null; spreadsRemaining: number }
            | { ok: false; code: string; error: string }
            | null;

          if (!json || !json.ok) {
            const blocked = json?.code === "free_exhausted" || json?.code === "logbook_full";
            if (blocked) setRemaining(0);
            updateUploads((list) =>
              list.map((u) =>
                u.key === next.key
                  ? { ...u, status: "error", blocked, error: json?.error ?? "The upload failed. Try again." }
                  : // Everything still waiting would be refused for the same reason.
                    blocked && u.status === "queued"
                    ? { ...u, status: "error", blocked, error: json?.error }
                    : u,
              ),
            );
            continue;
          }

          const url = URL.createObjectURL(blob);
          photoUrls.current.push(url);
          const page = json.page;
          changeSpreads((list) => [
            ...list,
            { key: next.key, page, original: page, photoUrl: url, note: json.note, done: false, ignored: [] },
          ]);
          setRemaining(json.spreadsRemaining);
          updateUploads((list) => list.filter((u) => u.key !== next.key));
        } catch (error) {
          updateUploads((list) =>
            list.map((u) =>
              u.key === next.key
                ? { ...u, status: "error", error: error instanceof Error ? error.message : "The upload failed." }
                : u,
            ),
          );
        }
      }
    } finally {
      processing.current = false;
    }
  }, [changeSpreads, props.logbookId, updateUploads]);

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const added: Upload[] = Array.from(files).map((file) => ({
      key: newKey(),
      file,
      name: file.name || "Photo",
      status: "queued",
    }));
    updateUploads((list) => [...list, ...added]);
    void processQueue();
  };

  const retry = (key?: string) => {
    updateUploads((list) =>
      list.map((u) => (u.status === "error" && (key === undefined || u.key === key) ? { ...u, status: "queued" } : u)),
    );
    void processQueue();
  };

  const unlock = async () => {
    setUnlockError(null);
    const response = await unlockLogbookAction(props.logbookId);
    if (!response.ok) {
      setUnlockError(response.error);
      return;
    }
    setUnlocked(true);
    setRemaining(response.spreadsRemaining);
    setUnlocks(response.availableUnlocks);
    if (uploadsRef.current.some((u) => u.blocked)) retry();
  };

  const save = async () => {
    setSaveState((state) => ({ ...state, saving: true, error: undefined }));
    const payload = JSON.stringify({
      version: 1,
      // Everything but the photo, which never leaves this tab.
      spreads: spreads.map((spread) => ({
        key: spread.key,
        page: spread.page,
        original: spread.original,
        note: spread.note,
        done: spread.done,
        ignored: spread.ignored,
      })),
    });
    const response = await saveLogbookAction(props.logbookId, name, payload);
    if (response.ok) {
      setSaveState({ savedAt: response.savedAt });
      setDirty(false);
    } else {
      setSaveState((state) => ({ ...state, saving: false, error: response.error }));
    }
  };

  const movePage = (from: number, to: number) => {
    if (to < 0 || to >= spreads.length) return;
    changeSpreads((list) => {
      const copy = [...list];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });
    setSelected(to);
  };

  const removePage = (index: number) => {
    changeSpreads((list) => list.filter((_, i) => i !== index));
    setSelected((value) => Math.max(0, Math.min(value, spreads.length - 2)));
  };

  const current = Math.min(selected, Math.max(0, spreads.length - 1));
  const blocked = uploads.some((u) => u.blocked);

  return (
    <div className="space-y-6">
      {/* Name and save */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="logbook-title" className="block text-xs font-medium text-muted-foreground">
            Logbook name
          </label>
          <input
            id="logbook-title"
            value={name}
            maxLength={120}
            onChange={(event) => {
              setName(event.target.value);
              setDirty(true);
            }}
            className="tap-target mt-1 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:border-brand focus:outline-none"
          />
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <button
            type="button"
            onClick={save}
            disabled={saveState.saving || spreads.length === 0}
            className="tap-target rounded-lg bg-brand px-5 text-sm font-semibold text-on-solid hover:bg-brand-strong disabled:opacity-50"
          >
            {saveState.saving ? "Saving…" : "Save to my account"}
          </button>
          <p className="text-xs text-muted-foreground" role="status">
            {saveState.error
              ? saveState.error
              : dirty
                ? "Unsaved changes — only kept in this tab."
                : saveState.savedAt
                  ? `Saved ${new Date(saveState.savedAt).toLocaleString("en-GB")}`
                  : "Not saved — nothing is stored unless you save."}
          </p>
        </div>
      </div>

      {/* Summary */}
      {spreads.length > 0 ? (
        <p
          role="status"
          className={`rounded-lg p-3 text-sm font-medium ${
            visibleCounts.error ? "bg-incorrect-soft text-incorrect" : visibleCounts.warning ? "bg-warning-soft text-warning" : "bg-correct-soft text-correct"
          }`}
        >
          {visibleCounts.error} {visibleCounts.error === 1 ? "error" : "errors"}, {visibleCounts.warning}{" "}
          {visibleCounts.warning === 1 ? "warning" : "warnings"} found across {spreads.length}{" "}
          {spreads.length === 1 ? "page" : "pages"}.
        </p>
      ) : null}

      {/* Tabs */}
      <div role="tablist" aria-label="Logbook steps" className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-surface p-1">
        {(
          [
            ["photos", "1. Photos"],
            ["review", "2. Review"],
            ["results", "3. Results"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            disabled={value !== "photos" && spreads.length === 0}
            className={`tap-target rounded-lg text-sm font-medium transition disabled:opacity-40 ${
              tab === value ? "bg-brand text-on-solid" : "text-foreground hover:bg-surface-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "photos" ? (
        <div className="space-y-4">
          {!props.configured ? (
            <p className="rounded-lg bg-warning-soft p-3 text-sm text-warning">
              Scanning is not switched on for this site yet.
            </p>
          ) : null}
          <div className="rounded-xl border border-dashed border-border bg-surface p-5">
            <p className="text-sm text-foreground">
              One photo per <strong>two-page spread</strong> — left page and right page together, flat, in good light,
              with the totals lines at the bottom in the shot. Pages are checked in the order you add them.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <label className="tap-target flex cursor-pointer items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid hover:bg-brand-strong">
                Take a photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  disabled={!props.configured}
                  onChange={(event) => {
                    addFiles(event.target.files);
                    event.target.value = "";
                  }}
                />
              </label>
              <label className="tap-target flex cursor-pointer items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-foreground hover:border-brand">
                Choose photos
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                  multiple
                  className="sr-only"
                  disabled={!props.configured}
                  onChange={(event) => {
                    addFiles(event.target.files);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              JPEG, PNG or HEIC, up to 10 MB each. {remaining} {remaining === 1 ? "spread" : "spreads"} left on this
              logbook{unlocked ? " (unlocked)" : ""}.
            </p>
          </div>

          {uploads.length > 0 ? (
            <ul className="space-y-2">
              {uploads.map((upload) => (
                <li key={upload.key} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{upload.name}</p>
                    <p className={`text-xs ${upload.status === "error" ? "text-incorrect" : "text-muted-foreground"}`}>
                      {upload.status === "queued"
                        ? "Waiting…"
                        : upload.status === "working"
                          ? "Reading the page — this can take up to a minute…"
                          : upload.error}
                    </p>
                  </div>
                  {upload.status === "error" && !upload.blocked ? (
                    <button
                      type="button"
                      onClick={() => retry(upload.key)}
                      className="min-h-9 shrink-0 rounded-lg border border-border px-3 text-xs font-medium hover:border-brand"
                    >
                      Retry
                    </button>
                  ) : null}
                  {upload.status !== "working" ? (
                    <button
                      type="button"
                      onClick={() => updateUploads((list) => list.filter((u) => u.key !== upload.key))}
                      className="min-h-9 shrink-0 rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground"
                      aria-label={`Remove ${upload.name}`}
                    >
                      Remove
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {(remaining === 0 || blocked) && !(unlocked && remaining === 0 && !blocked) ? (
            <div className="rounded-xl border border-brand bg-brand-soft p-4">
              <p className="font-semibold text-foreground">
                {unlocked ? "This logbook is full" : "Your free spreads are used up"}
              </p>
              {unlocked ? (
                <p className="mt-1 text-sm text-foreground">
                  An unlocked logbook takes up to 40 spreads. Start a new logbook for the rest.
                </p>
              ) : (
                <>
                  <p className="mt-1 text-sm text-foreground">
                    Unlock this logbook to scan up to 40 spreads.{props.priceLabel ? ` One-time ${props.priceLabel}.` : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {unlocks > 0 ? (
                      <button
                        type="button"
                        onClick={unlock}
                        className="tap-target rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid hover:bg-brand-strong"
                      >
                        Unlock this logbook ({unlocks} {unlocks === 1 ? "unlock" : "unlocks"} available)
                      </button>
                    ) : null}
                    <Link
                      href="/redeem"
                      className="tap-target inline-flex items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground hover:border-brand"
                    >
                      Redeem a license code
                    </Link>
                  </div>
                  {props.priceLabel && unlocks === 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Card payment is coming soon. Until then, unlocks come with a license code, and one is included
                      with a PilotQBank subscription.
                    </p>
                  ) : null}
                  {unlockError ? <p className="mt-2 text-xs text-incorrect">{unlockError}</p> : null}
                </>
              )}
            </div>
          ) : null}

          {spreads.length > 0 ? (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-foreground">Pages, in logbook order</h2>
              <ol className="space-y-2">
                {spreads.map((spread, index) => (
                  <li key={spread.key} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface p-2 text-sm">
                    <span className="px-1 font-medium text-foreground">
                      Page {index + 1}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {spread.page.rows.length} {spread.page.rows.length === 1 ? "row" : "rows"}
                      </span>
                    </span>
                    <span className="flex gap-1">
                      <button type="button" onClick={() => movePage(index, index - 1)} disabled={index === 0} className="min-h-9 min-w-9 rounded border border-border text-xs disabled:opacity-30" aria-label={`Move page ${index + 1} up`}>
                        ↑
                      </button>
                      <button type="button" onClick={() => movePage(index, index + 1)} disabled={index === spreads.length - 1} className="min-h-9 min-w-9 rounded border border-border text-xs disabled:opacity-30" aria-label={`Move page ${index + 1} down`}>
                        ↓
                      </button>
                      <button type="button" onClick={() => removePage(index)} className="min-h-9 rounded border border-border px-2 text-xs text-incorrect" aria-label={`Remove page ${index + 1}`}>
                        Remove
                      </button>
                    </span>
                  </li>
                ))}
              </ol>
              <button
                type="button"
                onClick={() => setTab("review")}
                className="tap-target mt-3 w-full rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid hover:bg-brand-strong sm:w-auto"
              >
                Review {spreads.length} {spreads.length === 1 ? "page" : "pages"} →
              </button>
            </div>
          ) : null}

          <LogbookPrivacyNotice />
        </div>
      ) : null}

      {tab === "review" && spreads.length > 0 ? (
        <div className="space-y-4">
          <nav aria-label="Pages" className="scroll-x flex gap-2 pb-1">
            {spreads.map((spread, index) => {
              const errors = result.findings.filter(
                (f) => f.page === index && f.severity === "error" && !spread.ignored.includes(f.key),
              ).length;
              return (
                <button
                  key={spread.key}
                  type="button"
                  onClick={() => setSelected(index)}
                  aria-current={index === current ? "page" : undefined}
                  className={`min-h-11 shrink-0 rounded-lg border px-3 text-sm font-medium ${
                    index === current ? "border-brand bg-brand-soft text-brand-ink" : "border-border text-foreground"
                  }`}
                >
                  Page {index + 1}
                  {errors > 0 ? <span className="ml-1.5 text-xs text-incorrect">●{errors}</span> : null}
                </button>
              );
            })}
          </nav>
          <ReviewPage
            key={spreads[current].key}
            index={current}
            spread={spreads[current]}
            result={result}
            onPage={(page) => changeSpreads((list) => list.map((s, i) => (i === current ? { ...s, page } : s)))}
            onIgnore={(key, ignore) =>
              changeSpreads((list) =>
                list.map((s, i) =>
                  i === current
                    ? { ...s, ignored: ignore ? [...new Set([...s.ignored, key])] : s.ignored.filter((k) => k !== key) }
                    : s,
                ),
              )
            }
          />
          <div className="flex justify-between gap-2">
            <button
              type="button"
              onClick={() => setSelected(Math.max(0, current - 1))}
              disabled={current === 0}
              className="tap-target rounded-lg border border-border px-4 text-sm font-medium disabled:opacity-40"
            >
              ← Previous page
            </button>
            {current < spreads.length - 1 ? (
              <button
                type="button"
                onClick={() => setSelected(current + 1)}
                className="tap-target rounded-lg border border-border px-4 text-sm font-medium"
              >
                Next page →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setTab("results")}
                className="tap-target rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid hover:bg-brand-strong"
              >
                See results →
              </button>
            )}
          </div>
        </div>
      ) : null}

      {tab === "results" && spreads.length > 0 ? (
        <Results
          name={name}
          spreads={spreads}
          onDone={(index, done) => changeSpreads((list) => list.map((s, i) => (i === index ? { ...s, done } : s)))}
        />
      ) : null}
    </div>
  );
}
