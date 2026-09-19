"use server";

import { revalidatePath } from "next/cache";

import { resolveQuestionReport } from "@/db/question-reports";
import { requireAdmin } from "@/lib/auth/require-admin";

/** Marks a question report resolved. `requireAdmin` first, same as every
 * other write under this area and under `/owner` — an action is its own
 * reachable entry point, so the page having checked does not cover it. */
export async function resolveReport(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await resolveQuestionReport(id);
  revalidatePath("/admin");
}
