import { afterEach, describe, expect, it } from "vitest";

import { getDb } from "@/db";
import {
  countPreviewQuestionsAnswered,
  hasPreviewedQuestion,
  previewedQuestionIdsAmong,
  recordPreviewAnswer,
  recordPreviewAnswers,
  sweepPreviewAttempts,
} from "@/db/preview";
import { previewAttempts } from "@/db/schema";
import { canAnswerQuestion, remainingFreeQuestions } from "@/lib/billing/access-policy";

/**
 * The signed-out preview allowance, against a real database.
 *
 * What this exists to hold down is the hole it was built to close: before
 * it, a visitor with no account could be handed every published question and
 * every answer, because there was nothing to count them against. The rule is
 * `canAnswerQuestion` — the same one the free tier uses — and these tests are
 * about the counting underneath it being right: distinct per question, scoped
 * per aircraft, and unaffected by answering the same question twice.
 */

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

const VISITOR = "a".repeat(64);
const OTHER_VISITOR = "b".repeat(64);

describeDb("signed-out preview attempts", () => {
  afterEach(async () => {
    await getDb().delete(previewAttempts);
  });

  it("counts a question once, however many times it is answered", async () => {
    await recordPreviewAnswer(VISITOR, "B737-ELEC-0001", "B737");
    await recordPreviewAnswer(VISITOR, "B737-ELEC-0001", "B737");
    await recordPreviewAnswer(VISITOR, "B737-ELEC-0001", "B737");

    expect(await countPreviewQuestionsAnswered(VISITOR, "B737")).toBe(1);
  });

  it("is scoped per aircraft, so trying a second type spends nothing of the first", async () => {
    await recordPreviewAnswer(VISITOR, "B737-ELEC-0001", "B737");
    await recordPreviewAnswer(VISITOR, "B737-ELEC-0002", "B737");
    await recordPreviewAnswer(VISITOR, "DA40-FUEL-0001", "DA40");

    expect(await countPreviewQuestionsAnswered(VISITOR, "B737")).toBe(2);
    expect(await countPreviewQuestionsAnswered(VISITOR, "DA40")).toBe(1);
  });

  it("accepts a lowercase aircraft code, like every other query here", async () => {
    await recordPreviewAnswer(VISITOR, "B737-ELEC-0001", "b737");

    expect(await countPreviewQuestionsAnswered(VISITOR, "b737")).toBe(1);
    expect(await countPreviewQuestionsAnswered(VISITOR, "B737")).toBe(1);
  });

  it("keeps one visitor's preview entirely separate from another's", async () => {
    await recordPreviewAnswer(VISITOR, "B737-ELEC-0001", "B737");

    expect(await countPreviewQuestionsAnswered(OTHER_VISITOR, "B737")).toBe(0);
    expect(await hasPreviewedQuestion(OTHER_VISITOR, "B737-ELEC-0001")).toBe(false);
  });

  it("reports whether one exact question has been previewed", async () => {
    await recordPreviewAnswer(VISITOR, "B737-ELEC-0001", "B737");

    expect(await hasPreviewedQuestion(VISITOR, "B737-ELEC-0001")).toBe(true);
    expect(await hasPreviewedQuestion(VISITOR, "B737-ELEC-0002")).toBe(false);
  });

  it("reads back a whole test's worth in one query", async () => {
    await recordPreviewAnswers(VISITOR, "B737", ["B737-ELEC-0001", "B737-ELEC-0003"]);

    const previewed = await previewedQuestionIdsAmong(VISITOR, [
      "B737-ELEC-0001",
      "B737-ELEC-0002",
      "B737-ELEC-0003",
    ]);

    expect([...previewed].sort()).toEqual(["B737-ELEC-0001", "B737-ELEC-0003"]);
  });

  it("ignores a question already recorded rather than failing the batch", async () => {
    await recordPreviewAnswer(VISITOR, "B737-ELEC-0001", "B737");
    // The shape Finish writes: some already spent, some not.
    await recordPreviewAnswers(VISITOR, "B737", ["B737-ELEC-0001", "B737-ELEC-0002"]);

    expect(await countPreviewQuestionsAnswered(VISITOR, "B737")).toBe(2);
  });

  it("writes nothing, and asks nothing, for an empty batch", async () => {
    await recordPreviewAnswers(VISITOR, "B737", []);
    expect(await countPreviewQuestionsAnswered(VISITOR, "B737")).toBe(0);
    expect(await previewedQuestionIdsAmong(VISITOR, [])).toEqual(new Set());
  });

  it("runs out after the allowance, and a repeat of a spent question stays free", async () => {
    const limit = 3;

    for (const id of ["B737-ELEC-0001", "B737-ELEC-0002", "B737-ELEC-0003"]) {
      const used = await countPreviewQuestionsAnswered(VISITOR, "B737");
      expect(
        canAnswerQuestion({
          hasSubscription: false,
          alreadyAnsweredThisQuestion: false,
          distinctAnsweredSoFar: used,
          limit,
        }),
      ).toBe(true);
      await recordPreviewAnswer(VISITOR, id, "B737");
    }

    const used = await countPreviewQuestionsAnswered(VISITOR, "B737");
    expect(remainingFreeQuestions(used, limit)).toBe(0);

    // A fourth, new question is refused …
    expect(
      canAnswerQuestion({
        hasSubscription: false,
        alreadyAnsweredThisQuestion: false,
        distinctAnsweredSoFar: used,
        limit,
      }),
    ).toBe(false);

    // … while one already spent costs nothing further, which is what makes
    // going back through the preview test free.
    expect(
      canAnswerQuestion({
        hasSubscription: false,
        alreadyAnsweredThisQuestion: await hasPreviewedQuestion(VISITOR, "B737-ELEC-0001"),
        distinctAnsweredSoFar: used,
        limit,
      }),
    ).toBe(true);
  });

  it("sweeps only rows older than the cutoff", async () => {
    await recordPreviewAnswer(VISITOR, "B737-ELEC-0001", "B737");
    await getDb()
      .insert(previewAttempts)
      .values({
        visitorId: VISITOR,
        questionId: "B737-ELEC-0099",
        aircraftCode: "B737",
        answeredAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      });

    expect(await sweepPreviewAttempts(180)).toBe(1);
    expect(await countPreviewQuestionsAnswered(VISITOR, "B737")).toBe(1);
  });
});
