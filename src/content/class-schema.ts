import { z } from "zod";

import { AIRCRAFT_CODE_RE, OPTION_ID_RE, optionSchema } from "./schema";

/**
 * The authoritative shape of a class rating's content file entries.
 *
 * A deliberate near-mirror of `schema.ts`: a class rating is a genuinely
 * separate content type from an aircraft (see the note on `classRatings` in
 * `db/schema.ts`), but a question is a question — same fields, same rules,
 * just filed under a class code instead of an aircraft code.
 */

/** Class codes are short, uppercase and URL-safe, e.g. SEP, MEP — the same
 * shape as an aircraft code, reused rather than redefined. */
export const CLASS_CODE_RE = AIRCRAFT_CODE_RE;

/** `<CLASS>-<TOPICCODE>-<4 digits>`, e.g. SEP-SYSTEMS-0001. */
export const CLASS_QUESTION_ID_RE = /^[A-Z][A-Z0-9]{1,7}-[A-Z0-9]{2,8}-\d{4}$/;

export const classQuestionSchema = z
  .strictObject({
    id: z
      .string()
      .regex(
        CLASS_QUESTION_ID_RE,
        "Question id must look like SEP-SYSTEMS-0001 (class code, topic code, 4 digits)",
      ),
    classCode: z.string().regex(CLASS_CODE_RE, "Class code must be uppercase, e.g. SEP"),
    topic: z.string().trim().min(1).max(60),
    subtopic: z.string().trim().min(1).max(60).optional(),
    question: z.string().trim().min(1, "Question text cannot be empty"),
    options: z
      .array(optionSchema)
      .min(2, "A question needs at least 2 options")
      .max(5, "A question can have at most 5 options"),
    correct: z.string().regex(OPTION_ID_RE),
    explanation: z.string().trim().min(1, "Every question needs an explanation"),
    reference: z.string().trim().min(1).max(200).optional(),
    media: z.string().trim().min(1).optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    status: z.enum(["draft", "published"]),
    version: z.int().min(1),
  })
  .superRefine((value, ctx) => {
    if (!Array.isArray(value.options)) return;

    const seen = new Set<string>();
    value.options.forEach((option, index) => {
      if (!option || typeof option.id !== "string") return;
      if (seen.has(option.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["options", index, "id"],
          message: `Duplicate option id "${option.id}" within the same question`,
        });
      }
      seen.add(option.id);
    });

    if (typeof value.correct === "string" && !seen.has(value.correct)) {
      ctx.addIssue({
        code: "custom",
        path: ["correct"],
        message: `"correct" is "${value.correct}" but the options are [${[...seen].join(", ")}]`,
      });
    }

    if (typeof value.id === "string" && typeof value.classCode === "string") {
      const prefix = value.id.split("-")[0];
      if (prefix !== value.classCode) {
        ctx.addIssue({
          code: "custom",
          path: ["id"],
          message: `Question id starts with "${prefix}" but "classCode" is "${value.classCode}"`,
        });
      }
    }
  });

export const classQuestionFileSchema = z
  .array(classQuestionSchema)
  .min(1, "A question file must contain at least one question");

export const classRatingSchema = z.strictObject({
  code: z.string().regex(CLASS_CODE_RE, "Class code must be uppercase, e.g. SEP"),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(600),
  /** `coming_soon` lets a class be listed before its bank is ready — the
   * same convention `aircraftSchema.status` uses. */
  status: z.enum(["active", "coming_soon"]),
  sortOrder: z.int().min(0).max(9999),
});

export type ClassQuestion = z.infer<typeof classQuestionSchema>;
export type ClassRatingManifest = z.infer<typeof classRatingSchema>;
