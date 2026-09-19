import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { emailIsConfigured } from "@/lib/email/send";

import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Forgotten password" };
export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  // Already signed in, so there is nothing to recover. Sending them home
  // rather than showing the form avoids the odd case of someone resetting a
  // password they are currently using and logging themselves out.
  if (await getCurrentUser()) redirect("/aircraft");

  return <ForgotForm emailConfigured={emailIsConfigured()} />;
}
