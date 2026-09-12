"use server";

import { z } from "zod";

import { getAnswerKey } from "@/db/queries";
import { gradeTest, type TestResult } from "@/lib/grading";

/**
 * Grades a finished test.
 *
 * Grading happens on the server for a reason: the browser is never sent the
 * correct answer or the explanation while a test is in progress, so the answers
 * cannot be read out of the page source.
 */

const submissionSchema = z.object({
  aircraftCode: z.string().regex(/^[A-Z][A-Z0-9]{1,7}$/),
  answers: z
    .array(
      z.object({
        questionId: z.string().max(40),
        selectedOptionId: z.string().max(4).nullable(),
      }),
    )
    .min(1)
    .max(50),
});

export type SubmitTestInput = z.infer<typeof submissionSchema>;

export async function submitTest(input: SubmitTestInput): Promise<TestResult> {
  const { aircraftCode, answers } = submissionSchema.parse(input);

  // The answer key is re-read from the database rather than trusted from the
  // client, and is scoped to this aircraft's published questions.
  const key = await getAnswerKey(
    aircraftCode,
    answers.map((answer) => answer.questionId),
  );

  if (key.length === 0) {
    throw new Error("Those questions could not be found. Please start a new test.");
  }

  // Preserve the order the user saw, which the client sends in `answers`.
  const keyById = new Map(key.map((question) => [question.id, question]));
  const ordered = answers
    .map((answer) => keyById.get(answer.questionId))
    .filter((question) => question !== undefined);

  return gradeTest(aircraftCode, ordered, answers);
}
