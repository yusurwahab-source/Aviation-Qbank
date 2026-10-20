"use client";

import { useState } from "react";

/**
 * HTML5 audio with a transcript fallback. The audio files are placeholders
 * (see `mockExam.ts`), so a failed load is expected and shown plainly.
 */
export function AudioPlayer({ src, transcript }: { src: string; transcript?: string }) {
  const [failed, setFailed] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-surface-muted p-3">
      <audio controls preload="none" src={src} className="w-full" onError={() => setFailed(true)}>
        Your browser does not support audio playback.
      </audio>
      {failed ? (
        <p className="mt-2 text-xs text-warning">
          Placeholder audio: this recording is not installed yet. Read the transcript instead.
        </p>
      ) : null}
      {transcript ? (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowTranscript((v) => !v)}
            className="tap-target text-sm font-medium text-brand-ink underline"
          >
            {showTranscript || failed ? "Hide transcript" : "Show transcript"}
          </button>
          {showTranscript || failed ? (
            <p className="question-text mt-1 text-sm text-foreground">{transcript}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
