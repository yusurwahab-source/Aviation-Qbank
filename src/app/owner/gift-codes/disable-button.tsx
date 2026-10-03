"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { disable, type DisableState } from "./actions";

/**
 * Stops a code being redeemed further, without deleting it — a two-step
 * confirm rather than a bare button, the same shape as `AccessForm`'s
 * revoke: disabling feels destructive even though nothing is actually
 * deleted, and a stray click should not cost a code that is still handing
 * out access.
 */
export function DisableButton({ giftCodeId, code }: { giftCodeId: string; code: string }) {
  const [state, formAction] = useActionState<DisableState, FormData>(disable, {});
  const [confirming, setConfirming] = useState(false);

  return (
    <form action={formAction}>
      <input type="hidden" name="giftCodeId" value={giftCodeId} />
      {confirming ? (
        <Confirm code={code} onCancel={() => setConfirming(false)} />
      ) : (
        <RequestButton onRequest={() => setConfirming(true)} />
      )}
      {state.error ? (
        <p role="alert" className="mt-1 text-xs text-incorrect">
          {state.error}
        </p>
      ) : null}
      {state.message ? <p className="mt-1 text-xs text-correct">{state.message}</p> : null}
    </form>
  );
}

function RequestButton({ onRequest }: { onRequest: () => void }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={onRequest}
      className="min-h-9 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-incorrect hover:text-incorrect disabled:cursor-not-allowed disabled:opacity-60"
    >
      Disable
    </button>
  );
}

function Confirm({ code, onCancel }: { code: string; onCancel: () => void }) {
  const { pending } = useFormStatus();
  return (
    <div className="rounded-lg border border-incorrect bg-incorrect-soft p-2">
      <p className="text-xs text-foreground">
        Disable <span className="font-mono">{code}</span>? It keeps its history but can no longer
        be redeemed.
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-9 rounded-lg bg-incorrect px-3 py-1.5 text-xs font-semibold text-on-danger transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Working…" : "Yes, disable"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onCancel}
          className="min-h-9 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
