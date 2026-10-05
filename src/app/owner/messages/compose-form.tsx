"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";

import { AUDIENCES, AUDIENCE_LABELS, type Audience } from "@/lib/broadcast/audience";
import { MAX_BODY_LENGTH, MAX_SUBJECT_LENGTH } from "@/lib/broadcast/compose";

import { queueBroadcast, sendTest, type ComposeState } from "./actions";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none";

type Counts = Record<Audience, { confirmed: number; all: number }>;

/**
 * The composer.
 *
 * The two buttons call their actions by hand with the form's contents rather
 * than submitting the form. A submitted form is reset by React once its
 * action finishes, which would wipe a message the owner has just spent ten
 * minutes writing the moment they pressed "Send a test" — the one button
 * whose whole point is to be pressed while still editing.
 *
 * "Send" is two steps, like Revoke and Disable elsewhere in the owner area:
 * the first press shows exactly how many people it goes to and a second
 * confirms. The count on the button comes from figures the page already has,
 * so it never promises more than the send does.
 */
export function ComposeForm({
  counts,
  configured,
  ownerEmail,
}: {
  counts: Counts;
  configured: boolean;
  ownerEmail: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [testState, testAction] = useActionState<ComposeState, FormData>(sendTest, {});
  const [queueState, queueAction] = useActionState<ComposeState, FormData>(queueBroadcast, {});
  const [testing, startTest] = useTransition();
  const [queueing, startQueue] = useTransition();
  const [audience, setAudience] = useState<Audience>("everyone");
  const [onlyConfirmed, setOnlyConfirmed] = useState(true);
  const [confirming, setConfirming] = useState(false);

  const recipients = counts[audience][onlyConfirmed ? "confirmed" : "all"];
  const canSend = configured && recipients > 0;

  useEffect(() => {
    if (queueState.broadcastId) router.push(`/owner/messages/${queueState.broadcastId}?start=1`);
  }, [queueState.broadcastId, router]);

  function formData(extra?: Record<string, string>): FormData | null {
    const form = formRef.current;
    if (!form || !form.reportValidity()) return null;
    const data = new FormData(form);
    for (const [key, value] of Object.entries(extra ?? {})) data.set(key, value);
    return data;
  }

  return (
    <div>
      {configured ? null : (
        <p role="alert" className="mb-4 rounded-lg bg-warning-soft px-4 py-3 text-sm text-warning">
          No mail provider is configured, so messages cannot be sent from here. Set RESEND_API_KEY and
          EMAIL_FROM on the host and verify the sending domain with the provider.
        </p>
      )}

      <form ref={formRef} onSubmit={(event) => event.preventDefault()} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="audience" className="block text-sm font-medium text-foreground">
              Send to
            </label>
            <select
              id="audience"
              name="audience"
              value={audience}
              onChange={(event) => {
                setAudience(event.target.value as Audience);
                setConfirming(false);
              }}
              className={inputClass}
            >
              {AUDIENCES.map((key) => (
                <option key={key} value={key}>
                  {AUDIENCE_LABELS[key].label} ({counts[key][onlyConfirmed ? "confirmed" : "all"]})
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-muted-foreground">{AUDIENCE_LABELS[audience].description}</p>
          </div>

          <div className="flex items-start gap-3 sm:pt-7">
            <input
              id="onlyConfirmed"
              name="onlyConfirmed"
              type="checkbox"
              checked={onlyConfirmed}
              onChange={(event) => {
                setOnlyConfirmed(event.target.checked);
                setConfirming(false);
              }}
              className="mt-1 h-4 w-4"
            />
            <label htmlFor="onlyConfirmed" className="text-sm text-foreground">
              Only confirmed email addresses
              <span className="block text-xs text-muted-foreground">
                An unconfirmed address may belong to somebody else, and bounces and spam reports damage
                the sending domain for everyone. Anyone who has unsubscribed is always left out.
              </span>
            </label>
          </div>
        </div>

        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-foreground">
            Subject
          </label>
          <input
            id="subject"
            name="subject"
            maxLength={MAX_SUBJECT_LENGTH}
            required
            onChange={() => setConfirming(false)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="body" className="block text-sm font-medium text-foreground">
            Message
          </label>
          <textarea
            id="body"
            name="body"
            rows={10}
            maxLength={MAX_BODY_LENGTH}
            required
            onChange={() => setConfirming(false)}
            className={inputClass}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Plain text. A blank line starts a new paragraph, and web addresses become links. Every
            message ends with a line saying why they are receiving it and an unsubscribe link; it
            cannot be removed.
          </p>
        </div>

        {testState.error ? (
          <p role="alert" className="text-sm text-incorrect">
            {testState.error}
          </p>
        ) : null}
        {testState.message ? <p className="text-sm text-correct">{testState.message}</p> : null}
        {queueState.error ? (
          <p role="alert" className="text-sm text-incorrect">
            {queueState.error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!configured || testing}
            title={`Sends one copy to ${ownerEmail}`}
            onClick={() => {
              const data = formData();
              if (data) startTest(() => testAction(data));
            }}
            className="min-h-11 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            {testing ? "Sending test…" : "Send a test to me"}
          </button>

          {confirming ? (
            <>
              <button
                type="button"
                disabled={!canSend || queueing}
                onClick={() => {
                  const data = formData({ confirmed: "yes" });
                  if (data) startQueue(() => queueAction(data));
                }}
                className="min-h-11 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-on-solid transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
              >
                {queueing ? "Queueing…" : `Yes, send to ${recipients}`}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="min-h-11 rounded-lg px-4 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={!canSend}
              onClick={() => {
                if (formData()) setConfirming(true);
              }}
              className="min-h-11 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-on-solid transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              {recipients === 0 ? "Nobody to send to" : `Send to ${recipients}…`}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
