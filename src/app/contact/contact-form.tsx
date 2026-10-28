"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { CONTACT_TOPICS, MAX_MESSAGE_LENGTH } from "@/lib/contact";

import { sendContactMessage, type ContactFormState } from "./actions";
import { HeroButton } from "@/components/ui/hero-button";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-brand";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <HeroButton type="submit" size="sm" fullWidth loading={pending}>
      {pending ? "Sending…" : "Send message"}
    </HeroButton>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-sm text-incorrect">
      {message}
    </p>
  );
}

export function ContactForm({ defaultEmail }: { defaultEmail?: string }) {
  const [state, formAction] = useActionState<ContactFormState, FormData>(sendContactMessage, {});

  if (state.done) {
    return (
      <div role="status">
        <h3 className="text-lg font-semibold text-foreground">Message sent</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Thank you. We read every message and will reply to the email address you gave.
        </p>
        <p className="mt-4">
          <Link href="/" className="link-standalone text-sm font-medium text-brand-ink hover:underline">
            ← Back home
          </Link>
        </p>
      </div>
    );
  }

  const values = state.values;
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error ? (
        <p role="alert" className="rounded-lg bg-incorrect-soft px-4 py-3 text-sm text-incorrect">
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-foreground">
            Your name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            maxLength={80}
            defaultValue={values?.name}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "name-error" : undefined}
            className={inputClass}
          />
          <FieldError id="name-error" message={errors.name} />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={values?.email ?? defaultEmail}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={inputClass}
          />
          <FieldError id="email-error" message={errors.email} />
        </div>
      </div>

      <div>
        <label htmlFor="topic" className="block text-sm font-medium text-foreground">
          What is it about?
        </label>
        <select
          id="topic"
          name="topic"
          defaultValue={values?.topic ?? ""}
          aria-invalid={errors.topic ? true : undefined}
          aria-describedby={errors.topic ? "topic-error" : undefined}
          className={inputClass}
        >
          <option value="" disabled>
            Choose one…
          </option>
          {CONTACT_TOPICS.map((topic) => (
            <option key={topic.value} value={topic.value}>
              {topic.label}
            </option>
          ))}
        </select>
        <FieldError id="topic-error" message={errors.topic} />
      </div>

      <div>
        <label htmlFor="questionId" className="block text-sm font-medium text-foreground">
          Question id <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <input
          id="questionId"
          name="questionId"
          type="text"
          maxLength={40}
          placeholder="B737-ELEC-0042"
          defaultValue={values?.questionId}
          aria-invalid={errors.questionId ? true : undefined}
          aria-describedby={errors.questionId ? "questionId-error" : undefined}
          className={`${inputClass} font-mono`}
        />
        <FieldError id="questionId-error" message={errors.questionId} />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-foreground">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={6}
          maxLength={MAX_MESSAGE_LENGTH}
          defaultValue={values?.message}
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? "message-error" : undefined}
          className={inputClass}
        />
        <FieldError id="message-error" message={errors.message} />
      </div>

      {/* Honeypot: off-screen, skipped by keyboards and screen readers. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px" }}>
        <label htmlFor="website">Leave this empty</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <SubmitButton />
    </form>
  );
}
