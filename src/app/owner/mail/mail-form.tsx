"use client";

import { useActionState } from "react";

import { MAX_MAIL_BODY, MAX_MAIL_SUBJECT } from "@/lib/mail/compose";

import { sendMail, type MailState } from "./actions";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none";

/**
 * One form for a new message and for a reply; a reply only differs in what it
 * starts with and in carrying the id of the message it answers.
 */
export function MailForm({
  defaultTo = "",
  defaultSubject = "",
  inReplyToId,
  submitLabel = "Send",
}: {
  defaultTo?: string;
  defaultSubject?: string;
  inReplyToId?: string;
  submitLabel?: string;
}) {
  const [state, action, pending] = useActionState<MailState, FormData>(sendMail, {});
  const values = state.values;

  return (
    <form action={action} className="space-y-4">
      {inReplyToId ? <input type="hidden" name="inReplyToId" value={inReplyToId} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="mail-to" className="block text-sm font-medium text-foreground">
            To
          </label>
          <input
            id="mail-to"
            name="to"
            type="email"
            required
            defaultValue={values?.to ?? defaultTo}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="mail-subject" className="block text-sm font-medium text-foreground">
            Subject
          </label>
          <input
            id="mail-subject"
            name="subject"
            required
            maxLength={MAX_MAIL_SUBJECT}
            defaultValue={values?.subject ?? defaultSubject}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="mail-body" className="block text-sm font-medium text-foreground">
          Message
        </label>
        <textarea
          id="mail-body"
          name="body"
          required
          rows={8}
          maxLength={MAX_MAIL_BODY}
          defaultValue={values?.body ?? ""}
          className={inputClass}
        />
      </div>

      {state.error ? (
        <p role="alert" className="rounded-lg bg-incorrect-soft px-4 py-3 text-sm text-incorrect">
          {state.error}
        </p>
      ) : null}
      {state.sent ? (
        <p role="status" className="rounded-lg bg-correct-soft px-4 py-3 text-sm text-correct">
          Sent. A copy is in Sent.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="tap-target rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-on-solid hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Sending…" : submitLabel}
      </button>
    </form>
  );
}
