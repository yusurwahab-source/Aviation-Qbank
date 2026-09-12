import { z } from "zod";

/**
 * The authoritative shape of a question file entry.
 *
 * This schema is the single source of truth for question content. It is used by
 * the content validator (which runs before every build) and by the seed script,
 * so a malformed file can never reach the database.
 */

/** Aircraft type codes are short, uppercase and URL-safe, e.g. DA40, A320, B737. */
export const AIRCRAFT_CODE_RE = /^[A-Z][A-Z0-9]{1,7}$/;

/**
 * Question ids are human-readable and carry their aircraft:
 * `<AIRCRAFT>-<TOPICCODE>-<4 digits>`, e.g. DA40-ELEC-0042.
 */
export const QUESTION_ID_RE = /^[A-Z][A-Z0-9]{1,7}-[A-Z0-9]{2,8}-\d{4}$/;

/** Option ids are single letters or short codes, e.g. "a", "b", "c", "d". */
export const OPTION_ID_RE = /^[a-z0-9]{1,4}$/;

export const DIFFICULTY_LABELS = {
  1: "Easy",
  2: "Moderate",
  3: "Hard",
} as const;

export const optionSchema = z.strictObject({
  id: z
    .string()
    .regex(OPTION_ID_RE, "Option id must be 1-4 lowercase letters or digits, e.g. 'a'"),
  text: z.string().trim().min(1, "Option text cannot be empty").max(500),
});

export const questionSchema = z
  .strictObject({
    id: z
      .string()
      .regex(
        QUESTION_ID_RE,
        "Question id must look like DA40-ELEC-0042 (aircraft code, topic code, 4 digits)",
      ),
    aircraft: z.string().regex(AIRCRAFT_CODE_RE, "Aircraft code must be uppercase, e.g. DA40"),
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
    difficulty: z.int().min(1).max(3),
    /** Reserved for Phase 5+. Kept in the schema so content authored now stays valid. */
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

    if (typeof value.id === "string" && typeof value.aircraft === "string") {
      const prefix = value.id.split("-")[0];
      if (prefix !== value.aircraft) {
        ctx.addIssue({
          code: "custom",
          path: ["id"],
          message: `Question id starts with "${prefix}" but "aircraft" is "${value.aircraft}"`,
        });
      }
    }
  });

export const questionFileSchema = z
  .array(questionSchema)
  .min(1, "A question file must contain at least one question");

export const aircraftSchema = z.strictObject({
  code: z.string().regex(AIRCRAFT_CODE_RE, "Aircraft code must be uppercase, e.g. DA40"),
  name: z.string().trim().min(1).max(120),
  manufacturer: z.string().trim().min(1).max(120),
  variant: z.string().trim().min(1).max(60).optional(),
  description: z.string().trim().min(1).max(600),
  /** `coming_soon` lets an aircraft be listed before its bank is ready. */
  status: z.enum(["active", "coming_soon"]),
  sortOrder: z.int().min(0).max(9999),
});

export type QuestionOption = z.infer<typeof optionSchema>;
export type Question = z.infer<typeof questionSchema>;
export type AircraftManifest = z.infer<typeof aircraftSchema>;
export type Difficulty = 1 | 2 | 3;
