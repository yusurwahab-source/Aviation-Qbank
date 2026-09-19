import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";

import { signUp } from "../actions";
import { AuthForm, PASSWORD_HINT } from "../auth-form";

export const metadata: Metadata = { title: "Create an account" };
export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  // Someone already signed in has no use for this page.
  if (await getCurrentUser()) redirect("/aircraft");

  return (
    <AuthForm
      action={signUp}
      title="Create an account"
      subtitle="An account will let you keep your practice history. Nothing is saved to it yet."
      submitLabel="Create account"
      pendingLabel="Creating account…"
      passwordHint={PASSWORD_HINT}
      passwordAutoComplete="new-password"
      footer={{ text: "Already have an account?", linkLabel: "Log in", href: "/login" }}
    />
  );
}
