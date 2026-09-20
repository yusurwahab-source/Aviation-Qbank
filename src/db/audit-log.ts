import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { auditLog } from "@/db/schema";
import type { AuditLogRow } from "@/db/schema";

/**
 * Writing and reading the owner action audit trail.
 *
 * `writeAuditLog` is called from exactly one place — `ownerAction` in
 * `src/lib/owner/audited-action.ts` — never by hand from an individual
 * action. That is what makes "every mutating owner action is logged" true
 * by construction rather than by someone remembering to call this on the
 * next one they write.
 */

export type AuditLogEntry = {
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
};

/**
 * Writes one audit row. Never throws: a lost log line must not cost the
 * owner a mutation that otherwise succeeded — the same reasoning `sendEmail`
 * and the settings read give for swallowing their own failures.
 */
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await getDb().insert(auditLog).values(entry);
  } catch (error) {
    console.error("Failed to write an audit log entry:", error);
  }
}

/** The log view's page of rows, newest first, optionally filtered by action. */
export async function listAuditLog(
  filter: { action?: string | null } = {},
  limit = 200,
): Promise<AuditLogRow[]> {
  const conditions = [];
  if (filter.action) conditions.push(eq(auditLog.action, filter.action));

  return getDb()
    .select()
    .from(auditLog)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}

/** Every distinct action name ever logged, for the filter dropdown. */
export async function listAuditLogActions(): Promise<string[]> {
  const rows = await getDb()
    .selectDistinct({ action: auditLog.action })
    .from(auditLog)
    .orderBy(auditLog.action);
  return rows.map((row) => row.action);
}
