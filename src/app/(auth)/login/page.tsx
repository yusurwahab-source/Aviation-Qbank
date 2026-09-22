import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";

import { logIn } from "../actions";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Log in" };
export const dynamic = "force-dynamic";

export default async function LogInPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <AuthForm
      action={logIn}
      title="Log in"
      subtitle="Welcome back."
      submitLabel="Log in"
      pendingLabel="Logging in…"
      passwordAutoComplete="current-password"
      passwordAside={{ label: "Forgotten?", href: "/forgot-password" }}
      footer={{ text: "No account yet?", linkLabel: "Create one", href: "/signup" }}
    />
  );
}
