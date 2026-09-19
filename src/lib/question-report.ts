import { z } from "zod";

/** What counts as an acceptable "report a problem with this question"
 * submission. Pure, like the other small input shapes in this app. */
export const questionReportSchema = z.object({
  questionId: z.string().min(1).max(40),
  aircraftCode: z.string().regex(/^[A-Z][A-Z0-9]{1,7}$/),
  message: z
    .string()
    .trim()
    .min(1, "Say what looks wrong")
    .max(2000, "That's too long — a sentence or two is enough"),
});

export type QuestionReportInput = z.infer<typeof questionReportSchema>;
