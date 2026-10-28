"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Card } from "@/components/ui";

import { confirmEmail, type ConfirmEmailState } from "../actions";
import { HeroButton } from "@/components/ui/hero-button";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <HeroButton type="submit" size="sm" fullWidth loading={pending}>
      {pending ? "Confirming…" : "Confirm my email"}
    </HeroButton>
  );
}

export function VerifyForm({ token, email }: { token: string; email: string }) {
  const [state, formAction] = useActionState<ConfirmEmailState, FormData>(confirmEmail, {});

  if (state.done) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Email confirmed</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{email}</span> is confirmed. You can
          subscribe and receive messages from us.
        </p>
        <p className="mt-6 text-center text-sm">
          <Link href="/account" className="font-medium text-brand-ink hover:underline">
            Go to your account
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Confirm your email
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        For <span className="font-medium text-foreground">{email}</span>.
      </p>

      <Card className="mt-6">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="token" value={token} />
          {state.error ? (
            <p role="alert" className="rounded-lg bg-incorrect-soft px-4 py-3 text-sm text-incorrect">
              {state.error}
            </p>
          ) : null}
          <SubmitButton />
        </form>
      </Card>
    </div>
  );
}
