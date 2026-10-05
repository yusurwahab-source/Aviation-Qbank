"use server";

import { z } from "zod";

import { findUserIdByEmail } from "@/db/logbook-owner";
import { grantLogbookCredits } from "@/db/logbooks";
import { ownerAction } from "@/lib/owner/audited-action";

export type GrantState = { error?: string; message?: string };

const grantSchema = z.object({
  email: z.string().trim().email().max(254),
  count: z.coerce.number().int().min(1).max(20),
  note: z
    .string()
    .trim()
    .max(200)
    .transform((value) => (value === "" ? null : value)),
});

/** Gives an account Logbook Scanner unlocks directly — no code to send. */
export const grantUnlocks = ownerAction<GrantState, z.infer<typeof grantSchema>>({
  action: "logbook.grant",
  targetType: "user",

  parse(formData) {
    const parsed = grantSchema.safeParse({
      email: formData.get("email"),
      count: formData.get("count") || "1",
      note: formData.get("note") ?? "",
    });
    if (!parsed.success) {
      return { ok: false, state: { error: "Enter an account's email and a count from 1 to 20." } };
    }
    return { ok: true, input: parsed.data };
  },

  async run(input) {
    const userId = await findUserIdByEmail(input.email);
    if (!userId) return { ok: false, state: { error: "No account has that email." } };

    await grantLogbookCredits({ userId, source: "manual", count: input.count, note: input.note });
    return {
      ok: true,
      targetId: userId,
      metadata: { count: input.count, note: input.note },
      state: {
        message: `Granted ${input.count} logbook ${input.count === 1 ? "unlock" : "unlocks"} to ${input.email}.`,
      },
    };
  },

  revalidate: [{ path: "/owner/logbook" }],
});
