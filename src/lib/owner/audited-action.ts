import "server-only";

import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/db/audit-log";
import { requireOwner } from "@/lib/auth/require-owner";

/**
 * The one wrapper every mutating `/owner` server action is built from.
 *
 * The brief this exists to satisfy is "log automatically, not something to
 * remember to call by hand in each handler" — the way to make that true is
 * for the handler to never get a chance to skip it. An action built with
 * `ownerAction` cannot return to its caller without going through this
 * function first, so the audit write is not a step an author could forget;
 * it is not a step they get to write at all.
 *
 * Three things happen here, in order, exactly once per call:
 * 1. `requireOwner()` — the same gate every action in this area already
 *    called for itself, now impossible to leave out of a new one.
 * 2. `parse(formData)` — turns the raw form into a validated input, or a
 *    failure `state` to return immediately. A parse failure is bad input,
 *    not an action that happened, so it is never logged.
 * 3. `run(input, owner)` — does the actual mutation and reports whether it
 *    happened. Only on `ok: true` is anything written to the audit log or
 *    revalidated — a `run` that decided nothing should change (a stale id,
 *    a business rule refusing the request) logs nothing, because nothing
 *    happened.
 */

export type OwnerActionOutcome<State> =
  | {
      ok: true;
      state: State;
      /** The thing this action acted on — a user id, a gift code, a report
       * id. Null for an action with no single target, e.g. a settings
       * change. */
      targetId?: string | null;
      /** Whatever this action thinks is worth keeping about what it did. */
      metadata?: Record<string, unknown>;
    }
  | { ok: false; state: State };

type ParseResult<Input, State> =
  | { ok: true; input: Input }
  | { ok: false; state: State };

export type OwnerActionSpec<State, Input> = {
  /** The audit log's `action` column, e.g. "account.grant". May depend on
   * the parsed input, for one action handling more than one intent (grant
   * vs. revoke share a form). */
  action: string | ((input: Input) => string);
  /** The audit log's `target_type` column, e.g. "user", "gift_code". */
  targetType: string | ((input: Input) => string);
  /** Extracts and validates the form's fields. A failure here is bad input,
   * never logged. */
  parse: (formData: FormData) => ParseResult<Input, State>;
  /** Performs the mutation and says what happened. */
  run: (input: Input, owner: { id: string; email: string }) => Promise<OwnerActionOutcome<State>>;
  /** Paths to revalidate after a successful mutation, in the same shape
   * `revalidatePath` itself takes. */
  revalidate?: Array<{ path: string; type?: "layout" | "page" }>;
};

/**
 * Builds a `useActionState`-shaped server action (`(previousState, formData)
 * => Promise<State>`) that owns its own owner check, audit logging and
 * revalidation.
 */
export function ownerAction<State, Input>(
  spec: OwnerActionSpec<State, Input>,
): (previousState: State, formData: FormData) => Promise<State> {
  return async function action(_previousState: State, formData: FormData): Promise<State> {
    const owner = await requireOwner();

    const parsed = spec.parse(formData);
    if (!parsed.ok) return parsed.state;

    const outcome = await spec.run(parsed.input, owner);
    if (!outcome.ok) return outcome.state;

    await writeAuditLog({
      actorEmail: owner.email,
      action: typeof spec.action === "function" ? spec.action(parsed.input) : spec.action,
      targetType:
        typeof spec.targetType === "function" ? spec.targetType(parsed.input) : spec.targetType,
      targetId: outcome.targetId ?? null,
      metadata: outcome.metadata ?? null,
    });

    for (const target of spec.revalidate ?? []) revalidatePath(target.path, target.type);

    return outcome.state;
  };
}
