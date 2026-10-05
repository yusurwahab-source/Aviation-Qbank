"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { sendBatch } from "./actions";

/**
 * Works through a broadcast a few emails at a time, for as long as this page
 * is open, and says how it is going.
 *
 * It stops on its own in three cases: nothing is left; a batch sent nothing
 * and failed nothing while rows remain (another sender holds them — they
 * come free again after a few minutes, so looping would just spin); or an
 * error. Closing the tab is always safe: the queue lives in the database and
 * "Continue sending" picks it up.
 */
export function SendProgress({
  broadcastId,
  initial,
  autoStart,
}: {
  broadcastId: string;
  initial: { queued: number; sending: number; sent: number; failed: number };
  autoStart: boolean;
}) {
  const router = useRouter();
  const [counts, setCounts] = useState(initial);
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const started = useRef(false);

  const total = counts.queued + counts.sending + counts.sent + counts.failed;
  const waiting = counts.queued + counts.sending;

  const run = useCallback(async () => {
    setRunning(true);
    setNote(null);

    for (;;) {
      const result = await sendBatch(broadcastId);

      if ("error" in result) {
        setNote(result.error);
        break;
      }

      setCounts((previous) => ({
        sent: previous.sent + result.sent,
        failed: previous.failed + result.failed,
        queued: result.remaining,
        sending: 0,
      }));

      if (result.remaining === 0) break;
      if (result.sent + result.failed === 0) {
        setNote("The rest are being sent by another window. Check back in a few minutes.");
        break;
      }
    }

    setRunning(false);
    router.refresh();
  }, [broadcastId, router]);

  useEffect(() => {
    if (autoStart && !started.current && waiting > 0) {
      started.current = true;
      void run();
    }
  }, [autoStart, run, waiting]);

  return (
    <div>
      <p className="text-sm text-foreground">
        <span className="font-semibold tabular-nums">{counts.sent}</span> sent ·{" "}
        <span className="font-semibold tabular-nums">{counts.failed}</span> failed ·{" "}
        <span className="font-semibold tabular-nums">{waiting}</span> waiting{" "}
        <span className="text-muted-foreground">of {total}</span>
      </p>

      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={counts.sent + counts.failed}
        aria-label="Messages sent"
      >
        <div
          className="h-full bg-brand transition-all"
          style={{ width: `${total === 0 ? 0 : ((counts.sent + counts.failed) / total) * 100}%` }}
        />
      </div>

      {note ? <p className="mt-2 text-sm text-muted-foreground">{note}</p> : null}

      {waiting > 0 && !running ? (
        <button
          type="button"
          onClick={() => void run()}
          className="mt-3 min-h-11 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-on-solid transition hover:bg-brand-strong"
        >
          {counts.sent + counts.failed === 0 ? "Start sending" : "Continue sending"}
        </button>
      ) : null}
      {running ? <p className="mt-3 text-sm text-muted-foreground">Sending — keep this page open.</p> : null}
    </div>
  );
}
