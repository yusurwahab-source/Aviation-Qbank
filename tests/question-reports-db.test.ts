import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { getDb } from "@/db";
import {
  countOpenQuestionReports,
  createQuestionReport,
  listQuestionReports,
  updateQuestionReportStatus,
} from "@/db/question-reports";
import { questionReports, users } from "@/db/schema";
import { hashPassword } from "@/lib/password";

/**
 * Question reports against a real database.
 *
 * A real, seeded question id (`DA40-FUEL-0101`) is used for the join test —
 * everything else uses a made-up id to check the "question no longer
 * exists" path, the same reasoning `reports.test.ts` gives for fabricating
 * ids against `attempts`: there is deliberately no foreign key to
 * `questions`, and a report must survive a content edit exactly as an
 * attempt does.
 */

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;
const REAL_QUESTION_ID = "DA40-FUEL-0101";

describeDb("question reports", () => {
  const createdUsers: string[] = [];
  const createdReportIds: string[] = [];

  async function makeUser(): Promise<{ id: string; email: string }> {
    const email = `reporter-${randomUUID()}@example.invalid`;
    const [row] = await getDb()
      .insert(users)
      .values({ email, passwordHash: await hashPassword("the-original-password") })
      .returning({ id: users.id });
    createdUsers.push(row.id);
    return { id: row.id, email };
  }

  afterAll(async () => {
    for (const id of createdReportIds) {
      await getDb().delete(questionReports).where(eq(questionReports.id, id));
    }
    for (const id of createdUsers) {
      await getDb().delete(users).where(eq(users.id, id));
    }
  });

  async function trackAndReport(input: Parameters<typeof createQuestionReport>[0]) {
    await createQuestionReport(input);
    const [row] = await getDb()
      .select({ id: questionReports.id })
      .from(questionReports)
      .where(eq(questionReports.questionId, input.questionId))
      .orderBy(questionReports.createdAt);
    if (row) createdReportIds.push(row.id);
  }

  it("records a report from a signed-in user and joins the current question", async () => {
    const user = await makeUser();
    await trackAndReport({
      questionId: REAL_QUESTION_ID,
      userId: user.id,
      reason: "wrong_answer",
      comment: "The marked answer looks wrong to me.",
    });

    const found = (await listQuestionReports({}, 500)).find(
      (r) => r.questionId === REAL_QUESTION_ID && r.reporterEmail === user.email,
    );

    expect(found).toBeDefined();
    expect(found?.status).toBe("open");
    expect(found?.question).not.toBeNull();
    expect(found?.question?.question.length).toBeGreaterThan(0);
  });

  it("records a report from a signed-out visitor with a null reporter", async () => {
    await trackAndReport({
      questionId: REAL_QUESTION_ID,
      userId: null,
      reason: "typo",
      comment: null,
    });

    const found = (await listQuestionReports({}, 500)).find(
      (r) => r.questionId === REAL_QUESTION_ID && r.reporterEmail === null && r.reason === "typo",
    );
    expect(found).toBeDefined();
  });

  it("shows a null question for an id that no longer exists in content", async () => {
    const fakeId = `DA40-GONE-${randomUUID().slice(0, 4)}`;
    await trackAndReport({
      questionId: fakeId,
      userId: null,
      reason: "outdated",
      comment: null,
    });

    const found = (await listQuestionReports({}, 500)).find((r) => r.questionId === fakeId);
    expect(found?.question).toBeNull();
  });

  it("filters by status", async () => {
    const user = await makeUser();
    await trackAndReport({
      questionId: REAL_QUESTION_ID,
      userId: user.id,
      reason: "unclear",
      comment: null,
    });

    const [report] = (await listQuestionReports({ status: "open" }, 500)).filter(
      (r) => r.reporterEmail === user.email,
    );
    expect(report).toBeDefined();

    const updated = await updateQuestionReportStatus(report!.id, "resolved");
    expect(updated?.questionId).toBe(REAL_QUESTION_ID);

    const stillOpen = (await listQuestionReports({ status: "open" }, 500)).some(
      (r) => r.id === report!.id,
    );
    const nowResolved = (await listQuestionReports({ status: "resolved" }, 500)).some(
      (r) => r.id === report!.id,
    );
    expect(stillOpen).toBe(false);
    expect(nowResolved).toBe(true);
  });

  it("returns null for a stale report id", async () => {
    expect(await updateQuestionReportStatus(randomUUID(), "dismissed")).toBeNull();
  });

  it("counts only open reports", async () => {
    const before = await countOpenQuestionReports();
    await trackAndReport({
      questionId: REAL_QUESTION_ID,
      userId: null,
      reason: "other",
      comment: null,
    });
    const after = await countOpenQuestionReports();
    expect(after).toBe(before + 1);
  });
});
