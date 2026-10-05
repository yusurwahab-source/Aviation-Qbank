"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  createLogbook,
  deleteAllLogbookData,
  getLogbookAccess,
  getSpreadsRemaining,
  saveLogbookData,
  unlockLogbook,
} from "@/db/logbooks";
import { getCurrentUser } from "@/lib/auth/session";
import { MAX_SAVED_BYTES, savedLogbookSchema } from "@/lib/logbook/saved";

/**
 * Logbook Scanner's server actions. Each one asks who is signed in for
 * itself — a server action is its own reachable entry point, so the page
 * having checked does not cover it — and every database call below is
 * scoped to that user.
 */

const nameSchema = z.string().trim().min(1).max(120);
const idSchema = z.string().uuid();

export async function startLogbook(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = nameSchema.safeParse(formData.get("name") || "My logbook");
  const id = await createLogbook(user.id, parsed.success ? parsed.data : "My logbook");
  redirect(`/tools/logbook/${id}`);
}

export type UnlockState =
  | { ok: true; spreadsRemaining: number; availableUnlocks: number }
  | { ok: false; error: string };

export async function unlockLogbookAction(logbookId: string): Promise<UnlockState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in again to unlock this logbook." };
  if (!idSchema.safeParse(logbookId).success) return { ok: false, error: "That logbook was not found." };

  const result = await unlockLogbook(user.id, logbookId);
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.reason === "no_credit"
          ? "You have no logbook unlocks. Redeem a license code first."
          : "That logbook was not found.",
    };
  }
  revalidatePath("/tools/logbook");
  const [spreadsRemaining, access] = await Promise.all([
    getSpreadsRemaining(user.id, logbookId),
    getLogbookAccess(user.id),
  ]);
  return { ok: true, spreadsRemaining, availableUnlocks: access.availableUnlocks };
}

export type SaveState = { ok: true; savedAt: string } | { ok: false; error: string };

/** Stores the reviewed pages — never the photos — when the student asks. */
export async function saveLogbookAction(logbookId: string, name: string, json: string): Promise<SaveState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in again to save." };
  if (!idSchema.safeParse(logbookId).success) return { ok: false, error: "That logbook was not found." };
  if (json.length > MAX_SAVED_BYTES) return { ok: false, error: "This logbook is too large to save." };

  const parsedName = nameSchema.safeParse(name);
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { ok: false, error: "The logbook could not be saved." };
  }
  const parsed = savedLogbookSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "The logbook could not be saved." };

  const saved = await saveLogbookData(
    user.id,
    logbookId,
    parsedName.success ? parsedName.data : "My logbook",
    parsed.data,
  );
  if (!saved) return { ok: false, error: "That logbook was not found." };
  revalidatePath("/tools/logbook");
  return { ok: true, savedAt: new Date().toISOString() };
}

export type DeleteState = { error?: string; deleted?: number };

/** "Delete all my logbook data". The confirm step is in the browser and is
 * checked again here, for the same reason Accounts' revoke is. */
export async function deleteAllLogbookDataAction(
  _previous: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (formData.get("confirmed") !== "yes") return { error: "Confirm before deleting." };

  const deleted = await deleteAllLogbookData(user.id);
  revalidatePath("/tools/logbook");
  return { deleted };
}
