"use client";

import { useActionState, useState } from "react";

import { deleteAllLogbookDataAction, type DeleteState } from "./actions";

/** "Delete all my logbook data", behind a two-step confirm. */
export function DeleteAllLogbookData() {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState<DeleteState, FormData>(deleteAllLogbookDataAction, {});

  if (state.deleted !== undefined) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Deleted. {state.deleted === 1 ? "1 logbook" : `${state.deleted} logbooks`} removed from your account.
      </p>
    );
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="tap-target rounded-lg border border-border px-4 text-sm font-medium text-incorrect transition hover:border-incorrect"
      >
        Delete all my logbook data
      </button>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="confirmed" value="yes" />
      <p className="text-sm text-foreground">
        This deletes every saved logbook and any unlock attached to one. It cannot be undone.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="tap-target rounded-lg bg-incorrect px-4 text-sm font-semibold text-on-danger disabled:opacity-60"
        >
          {pending ? "Deleting…" : "Yes, delete everything"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="tap-target rounded-lg border border-border px-4 text-sm font-medium text-foreground"
        >
          Cancel
        </button>
      </div>
      {state.error ? <p className="text-xs text-incorrect">{state.error}</p> : null}
    </form>
  );
}
