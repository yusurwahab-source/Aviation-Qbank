/**
 * What the navigator knows about each question in a running test.
 *
 * Pure, and deliberately in its own module rather than inside the component:
 * the rule that exam mode must not give away which answers were right is the
 * sort of thing that gets broken by a well-meaning refactor, and it is much
 * easier to hold onto when it can be asserted directly.
 */

export type QuestionStatus =
  /** Not answered yet. */
  | "unanswered"
  /** Answered, but with nothing said about whether it was right. */
  | "answered"
  | "correct"
  | "incorrect";

/**
 * The status of one question, from what the runner already knows.
 *
 * The whole exam-mode guarantee rests on one thing: `verdicts` is only ever
 * populated in study mode. In exam mode it is empty, so every answered
 * question reports `answered` and nothing more — there is no branch here that
 * could leak correctness, because the information simply is not present.
 */
export function questionStatus(
  questionId: string,
  answers: Record<string, string>,
  verdicts: Record<string, { isCorrect: boolean }>,
): QuestionStatus {
  if (!(questionId in answers)) return "unanswered";

  const verdict = verdicts[questionId];
  if (!verdict) return "answered";

  return verdict.isCorrect ? "correct" : "incorrect";
}

/** How many of these questions are still unanswered. */
export function unansweredCount(
  questionIds: string[],
  answers: Record<string, string>,
): number {
  return questionIds.filter((id) => !(id in answers)).length;
}

/**
 * The next question worth going to, from where the student is now.
 *
 * Wraps around: at the end of a test the unanswered ones left behind are
 * before you, not after, and that is exactly when this is most useful.
 *
 * Never answers with the question already on screen. The caller is asking
 * where to go next, so "stay here" is not an answer — it would make the
 * button look broken. Null means there is nowhere else to be.
 */
export function nextUnansweredIndex(
  questionIds: string[],
  answers: Record<string, string>,
  from: number,
): number | null {
  const count = questionIds.length;

  // Stops one short of a full lap, which is what excludes `from` itself.
  for (let step = 1; step < count; step++) {
    const index = (from + step) % count;
    if (!(questionIds[index] in answers)) return index;
  }

  return null;
}
