"use server";

import { z } from "zod";

import { createGiftCodes, disableGiftCode } from "@/db/gift-codes";
import { listAircraft } from "@/db/queries";
import { ownerAction } from "@/lib/owner/audited-action";

import { MAX_GENERATE_COUNT } from "./constants";

export type GenerateState = {
  error?: string;
  codes?: string[];
};

const AIRCRAFT_CODE_PATTERN = /^[A-Z][A-Z0-9]{1,7}$/;

const generateSchema = z.object({
  count: z.coerce.number().int().min(1).max(MAX_GENERATE_COUNT),
  days: z.coerce.number().int().min(1),
  plan: z.enum(["monthly", "quarterly"]),
  note: z
    .string()
    .trim()
    .max(200)
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional(),
  maxRedemptions: z.coerce.number().int().min(1).max(100_000).default(1),
  expiresAt: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? new Date(value) : null)),
  /** Empty string means "all aircraft" — `null` in storage. */
  unlocksAircraftCode: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .transform((value) => (value ? value : null)),
});

type GenerateInput = z.infer<typeof generateSchema>;

/**
 * Mints license keys from the website, for an owner who would otherwise need
 * `npm run gift:generate` and a database connection to do this at all.
 *
 * `unlocksAircraftCode` is stored but not enforced by redemption — see the
 * note on the column in `schema.ts` — so it is validated only for shape and
 * existence here, the same DB-existence check `updateSettings` runs for the
 * featured aircraft, never wired into what a redemption actually grants.
 */
export const generate = ownerAction<GenerateState, GenerateInput>({
  action: "gift_code.generate",
  targetType: "gift_code",

  parse(formData) {
    const raw = {
      count: formData.get("count"),
      days: formData.get("days"),
      plan: formData.get("plan"),
      note: formData.get("note") ?? undefined,
      maxRedemptions: formData.get("maxRedemptions") || "1",
      expiresAt: formData.get("expiresAt") ?? undefined,
      unlocksAircraftCode: formData.get("unlocksAircraftCode") ?? undefined,
    };

    const parsed = generateSchema.safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue?.path[0];
      const message =
        field === "count"
          ? `Count must be a whole number from 1 to ${MAX_GENERATE_COUNT}.`
          : field === "days"
            ? "Days must be a positive whole number."
            : field === "plan"
              ? "Choose a plan."
              : field === "maxRedemptions"
                ? "Max redemptions must be a whole number of at least 1."
                : "That form could not be read.";
      return { ok: false, state: { error: message } };
    }

    if (parsed.data.expiresAt && Number.isNaN(parsed.data.expiresAt.getTime())) {
      return { ok: false, state: { error: "That expiry date could not be read." } };
    }
    if (parsed.data.unlocksAircraftCode && !AIRCRAFT_CODE_PATTERN.test(parsed.data.unlocksAircraftCode)) {
      return { ok: false, state: { error: "That aircraft code is not valid." } };
    }

    return { ok: true, input: parsed.data };
  },

  async run(input) {
    if (input.unlocksAircraftCode) {
      const fleet = await listAircraft();
      if (!fleet.some((plane) => plane.code === input.unlocksAircraftCode)) {
        return {
          ok: false,
          state: { error: `"${input.unlocksAircraftCode}" is not an aircraft in the bank.` },
        };
      }
    }

    const codes = await createGiftCodes({
      count: input.count,
      durationDays: input.days,
      plan: input.plan,
      note: input.note ?? null,
      maxRedemptions: input.maxRedemptions,
      expiresAt: input.expiresAt,
      unlocksAircraftCode: input.unlocksAircraftCode,
    });

    return {
      ok: true,
      metadata: {
        count: input.count,
        days: input.days,
        plan: input.plan,
        maxRedemptions: input.maxRedemptions,
        expiresAt: input.expiresAt?.toISOString() ?? null,
        unlocksAircraftCode: input.unlocksAircraftCode,
        note: input.note ?? null,
      },
      // The list below the form is part of this page's answer, so it has to
      // show the codes that were just minted rather than the set it
      // rendered with.
      state: { codes },
    };
  },

  revalidate: [{ path: "/owner/gift-codes" }],
});

export type DisableState = { error?: string; message?: string };

const disableSchema = z.object({ giftCodeId: z.string().uuid() });

/** Stops a code being redeemed further, without deleting it or its
 * redemption history — the confirm step lives in `disable-button.tsx`. */
export const disable = ownerAction<DisableState, z.infer<typeof disableSchema>>({
  action: "gift_code.disable",
  targetType: "gift_code",

  parse(formData) {
    const parsed = disableSchema.safeParse({ giftCodeId: formData.get("giftCodeId") });
    if (!parsed.success) return { ok: false, state: { error: "No code was named." } };
    return { ok: true, input: parsed.data };
  },

  async run(input) {
    const disabled = await disableGiftCode(input.giftCodeId);
    if (!disabled) return { ok: false, state: { error: "That code no longer exists." } };

    return {
      ok: true,
      targetId: input.giftCodeId,
      metadata: { code: disabled.code },
      state: { message: `${disabled.code} is now disabled.` },
    };
  },

  revalidate: [{ path: "/owner/gift-codes" }],
});
