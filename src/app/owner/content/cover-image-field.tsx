"use client";

import { useRef, useState } from "react";

import { MAX_POST_IMAGE_BYTES, POST_IMAGE_ACCEPT, uploadedImageId } from "@/lib/post-images";

/**
 * The cover image control in the owner's editor: choose a file, see it,
 * replace it, remove it.
 *
 * Uploading is its own request (`/api/owner/post-images`), done as soon as a
 * file is chosen, so the preview is the stored image and the result is a
 * path that goes into the same `coverImageUrl` field the pasted-link input
 * has always filled. Saving the post is what attaches it. `XMLHttpRequest`
 * rather than `fetch`, only because it reports upload progress. The size
 * and type checks here are a courtesy for fast feedback — the server checks
 * the real bytes again.
 */

type Status =
  | { kind: "idle" }
  | { kind: "uploading"; percent: number }
  | { kind: "done"; message: string }
  | { kind: "error"; message: string };

export function CoverImageField({
  url,
  onChange,
  inputClass,
}: {
  url: string;
  /** Called with the new `coverImageUrl` ("" to remove). */
  onChange: (url: string) => void;
  inputClass: string;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [previewFailed, setPreviewFailed] = useState(false);
  const uploading = status.kind === "uploading";
  const isUpload = uploadedImageId(url) !== null;

  function upload(file: File) {
    if (file.size > MAX_POST_IMAGE_BYTES) {
      setStatus({ kind: "error", message: "That image is larger than 4 MB. Choose a smaller one." });
      return;
    }
    setStatus({ kind: "uploading", percent: 0 });
    const body = new FormData();
    body.set("image", file);

    const request = new XMLHttpRequest();
    request.open("POST", "/api/owner/post-images");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) setStatus({ kind: "uploading", percent: Math.round((event.loaded / event.total) * 100) });
    };
    request.onerror = () => setStatus({ kind: "error", message: "The upload failed. Check your connection and try again." });
    request.onload = () => {
      let result: { ok?: boolean; url?: string; error?: string } = {};
      try {
        result = JSON.parse(request.responseText);
      } catch {
        // fall through to the generic message
      }
      if (request.status === 200 && result.ok && result.url) {
        setPreviewFailed(false);
        onChange(result.url);
        setStatus({ kind: "done", message: "Image uploaded. Describe it below, then save the post to publish it." });
      } else {
        setStatus({
          kind: "error",
          message: request.status === 404 ? "You are signed out or not allowed to upload." : (result.error ?? "The upload failed. Please try again."),
        });
      }
    };
    request.send(body);
  }

  function remove() {
    onChange("");
    setPreviewFailed(false);
    setStatus({ kind: "done", message: "Image removed. Save the post to apply this." });
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-lg border border-border bg-surface-muted">
        {url && !previewFailed ? (
          // eslint-disable-next-line @next/next/no-img-element -- a stored upload or an owner-supplied link
          <img src={url} alt="Cover preview" onError={() => setPreviewFailed(true)} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
            {url ? "This image could not be loaded." : "No cover image. The section's default is used."}
          </div>
        )}
        {uploading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/80 text-sm font-medium text-foreground">
            Uploading… {status.percent}%
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          ref={fileInput}
          id="coverImageFile"
          type="file"
          accept={POST_IMAGE_ACCEPT}
          className="sr-only"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) upload(file);
          }}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInput.current?.click()}
          className="tap-target inline-flex items-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:border-brand disabled:opacity-60"
        >
          {url ? "Replace image" : "Upload image"}
        </button>
        {url ? (
          <button
            type="button"
            disabled={uploading}
            onClick={remove}
            className="tap-target inline-flex items-center rounded-lg border border-danger px-4 text-sm font-semibold text-danger disabled:opacity-60"
          >
            Remove
          </button>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">JPEG, PNG or WebP, up to 4 MB. A 1200×675 (16:9) picture fits the card exactly.</p>
      <div aria-live="polite">
        {status.kind === "done" ? <p className="text-sm text-success">{status.message}</p> : null}
        {status.kind === "error" ? (
          <p role="alert" className="text-sm text-danger">
            {status.message}
          </p>
        ) : null}
      </div>

      <details open={url !== "" && !isUpload}>
        <summary className="cursor-pointer text-sm text-muted-foreground">Or use an image link instead</summary>
        <label htmlFor="coverImageUrl" className="mt-2 block text-sm font-medium text-foreground">
          Image link
        </label>
        <input
          id="coverImageUrl"
          name="coverImageUrl"
          value={url}
          onChange={(e) => {
            setPreviewFailed(false);
            onChange(e.target.value);
          }}
          className={inputClass}
          inputMode="url"
          autoCapitalize="none"
        />
        <p className="mt-1 text-xs text-muted-foreground">Starting with https://. Uploading a file fills this in for you.</p>
      </details>
    </div>
  );
}
