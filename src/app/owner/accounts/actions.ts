"use server";

import { z } from "zod";

import { grantAccess, revokeAccess, upsertAccountNote } from "@/db/owner";
import { ownerAction } from "@/lib/owner/audited-action";

export type AccessState = {
  error?: string;
  message?: string;
  /** Set when the change was made but does not mean what it looks like —
   * see the Stripe note in `revokeAccess`. */
  warning?: string;
};

const grantSchema = z.object({
  intent: z.literal("grant"),
  userId: z.string().min(1),
  days: z.coerce.number().int().min(1).max(3650),
  plan: z.enum(["monthly", "quarterly"]),
});

const revokeSchema = z.object({
  intent: z.literal("revoke"),
  userId: z.string().min(1),
  /** The revoke button only submits once a client-side confirm step has
   * been shown — see `access-form.tsx`. Checked again here because a
   * server action is its own entry point, reachable directly, not only
   * through a form that happened to confirm first. */
  confirmed: z.literal("true"),
});

type AccessInput =
  | z.infer<typeof grantSchema>
  | { intent: "revoke"; userId: string; confirmed: "true" };

/**
 * Grants or revokes one account's access from the accounts list or the
 * account detail screen.
 *
 * One action for both because they are one decision made in one place: the
 * form carries an `intent` from whichever button was pressed.
 */
export const updateAccess = ownerAction<AccessState, AccessInput>({
  action: (input) => (input.intent === "grant" ? "account.grant" : "account.revoke"),
  targetType: "user",

  parse(formData) {
    const intent = formData.get("intent");

    if (intent === "revoke") {
      const parsed = revokeSchema.safeParse(Object.fromEntries(formData));
      if (!parsed.success) {
        return {
          ok: false,
          state: { error: "Revoking needs to be confirmed first." },
        };
      }
      return { ok: true, input: parsed.data };
    }

    if (intent === "grant") {
      const parsed = grantSchema.safeParse(Object.fromEntries(formData));
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        const message =
          issue?.path[0] === "days"
            ? "Days must be a whole number from 1 to 3650."
            : issue?.path[0] === "plan"
              ? "Choose a plan."
              : "No account was named.";
        return { ok: false, state: { error: message } };
      }
      return { ok: true, input: parsed.data };
    }

    return { ok: false, state: { error: "Choose grant or revoke." } };
  },

  async run(input) {
    if (input.intent === "revoke") {
      const revoked = await revokeAccess(input.userId);
      if (!revoked) {
        return { ok: false, state: { error: "That account has no subscription to revoke." } };
      }

      return {
        ok: true,
        targetId: input.userId,
        metadata: { provider: revoked.provider },
        state: {
          message: `Access removed from ${revoked.email}.`,
          warning:
            revoked.provider === "stripe"
              ? "This was a Stripe subscription. It is still billing — cancel it in Stripe too, or the next renewal will turn access back on."
              : undefined,
        },
      };
    }

    const granted = await grantAccess({ userId: input.userId, plan: input.plan, days: input.days });
    if (!granted) return { ok: false, state: { error: "That account no longer exists." } };

    return {
      ok: true,
      targetId: input.userId,
      metadata: { plan: input.plan, days: input.days, periodEnd: granted.periodEnd.toISOString() },
      state: {
        message: `${granted.email} now has access until ${granted.periodEnd.toLocaleDateString(
          undefined,
          { day: "numeric", month: "short", year: "numeric" },
        )}.`,
      },
    };
  },

  revalidate: (input) => [
    { path: "/owner/accounts" },
    { path: `/owner/accounts/${input.userId}` },
  ],
});

export type NoteState = { error?: string; message?: string };

const noteSchema = z.object({
  userId: z.string().min(1),
  body: z.string().max(4000),
});

/** The owner's private note on one account — see `account_notes` in `schema.ts`. */
export const updateAccountNote = ownerAction<NoteState, z.infer<typeof noteSchema>>({
  action: "account.note",
  targetType: "user",

  parse(formData) {
    const parsed = noteSchema.safeParse({
      userId: formData.get("userId"),
      body: formData.get("body") ?? "",
    });
    if (!parsed.success) return { ok: false, state: { error: "That note could not be saved." } };
    return { ok: true, input: parsed.data };
  },

  async run(input) {
    await upsertAccountNote(input.userId, input.body.trim());
    return {
      ok: true,
      targetId: input.userId,
      metadata: { length: input.body.trim().length },
      state: { message: "Note saved." },
    };
  },

  revalidate: (input) => [{ path: `/owner/accounts/${input.userId}` }],
});
