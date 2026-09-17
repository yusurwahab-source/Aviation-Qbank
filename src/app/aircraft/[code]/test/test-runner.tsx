"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState, useTransition } from "react";

import { Badge, Card } from "@/components/ui";
import { QuestionNavigator, type QuestionStatus } from "@/components/question-navigator";
import { TestProgress } from "@/components/test-progress";
import type { TestQuestion } from "@/db/queries";
import { unansweredCount } from "@/lib/question-status";
import {
  DEFAULT_TEST_MODE,
  formatClock,
  secondsLeft,
  secondsSince,
  type TestMode,
} from "@/lib/test-options";

import { answerQuestion, submitTest, type AnswerVerdict, type SubmitTestOutput } from "./actions";
import { QuestionNav } from "./question-nav";
import { ResultScreen } from "./result-screen";

/**
 * Runs one practice test: one question on screen at a time, then a result
 * screen. It sits either of two ways.
 *
 * **Study** — answering sends the question to the server, which grades that
 * one question and sends back the correct option and the explanation, shown
 * immediately underneath. The page never carries the answer key itself; it
 * arrives a question at a time, in reply to being answered. A revealed
 * question is then settled: its options stop responding, because letting a
 * student switch to the answer they have just been shown would make every
 * score, topic breakdown and retry list meaningless.
 *
 * **Exam** — nothing comes back but the acknowledgement, and nothing settles.
 * Answers can be changed right up to Finish, which is where the whole test is
 * marked at once. This is the mode that resembles sitting the real thing.
 *
 * Either way, for a signed-in student the answer is recorded as it is given,
 * which is what survives a refresh or an abandoned test.
 */
export function TestRunner({
  aircraftCode,
  aircraftName,
  questions,
  topics = [],
  /**
   * Identifies this attempt at the test. Comes from `?t=` in the URL now,
   * rather than being minted inside the browser — that is what makes the
   * test resumable across a refresh, since the same id names the same
   * session on the server. A fresh test, and a restarted one, get a new id
   * from a server redirect, not from anything this component does.
   */
  clientTestId,
  /** Answers already recorded for this session — set only when resuming. */
  initialAnswers = {},
  /**
   * The verdicts for those answers. A resumed question was already answered,
   * so its answer has already been revealed once and comes back revealed.
   */
  initialVerdicts = {},
  /**
   * Study marks each question as it is answered; exam holds it all back to
   * the end. See `parseTestMode` — it is a setting, not an enforcement.
   */
  mode = DEFAULT_TEST_MODE,
  /**
   * The clock this test gets, in seconds, or null in study mode. Derived by
   * the server from the mode and the question count — the browser is told
   * what it is, it does not ask for one. Used only for the first render;
   * once the session exists the server's own `expiresAt` is what counts.
   */
  timeLimitSeconds = null,
  /**
   * When this test began, as the server holds it, when there is one to
   * resume. Study mode counts up from here. ISO strings throughout so they
   * survive the server/client boundary unchanged.
   */
  initialStartedAt = null,
  /** The deadline as the server holds it, on a resumed exam. */
  initialExpiresAt = null,
}: {
  aircraftCode: string;
  aircraftName: string;
  questions: TestQuestion[];
  /** The sections the student chose. Empty means the whole bank. */
  topics?: string[];
  clientTestId: string;
  initialAnswers?: Record<string, string>;
  initialVerdicts?: Record<string, AnswerVerdict>;
  mode?: TestMode;
  timeLimitSeconds?: number | null;
  initialStartedAt?: string | null;
  initialExpiresAt?: string | null;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(() => {
    if (Object.keys(initialAnswers).length === 0) return 0;
    const firstUnanswered = questions.findIndex((q) => !(q.id in initialAnswers));
    // Everything was already answered — land on the last question, one click
    // from Finish, rather than back at the start of a test already done.
    return firstUnanswered === -1 ? questions.length - 1 : firstUnanswered;
  });
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  /** Keyed by question id; a key present means that question is settled. */
  const [verdicts, setVerdicts] = useState<Record<string, AnswerVerdict>>(initialVerdicts);
  /** The question waiting on the server, so its options can show as busy. */
  const [pending, setPending] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitTestOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  /**
   * Set when a signed-in student without a subscription reaches the free
   * allowance on this aircraft. The question they were on is left unanswered
   * — see `answerQuestion`'s "paywall" status — so `select` below reverts the
   * optimistic answer it had already recorded locally.
   */
  const [paywall, setPaywall] = useState(false);
  const [isSubmitting, startSubmitting] = useTransition();
  const [isRestarting, startRestarting] = useTransition();
  /**
   * The deadline the countdown follows, in exam mode. Null in study mode,
   * which has nothing to run out of.
   *
   * On a resumed test this comes from the server and is authoritative — that
   * is what stops a refresh handing out a fresh countdown. On a brand new
   * one there is no session yet, so it starts from the limit counted from
   * now, and is replaced by the server's own figure with the first answer.
   */
  const [deadline, setDeadline] = useState<Date | null>(() => {
    if (initialExpiresAt) return new Date(initialExpiresAt);
    if (timeLimitSeconds === null) return null;
    return new Date(Date.now() + timeLimitSeconds * 1000);
  });
  /**
   * When this sitting began, for the study-mode stopwatch. Same story as the
   * deadline: the server's figure when there is one, this render otherwise,
   * replaced by the server's with the first answer.
   *
   * Signed out there is never a server figure, so the count restarts on a
   * refresh. Nothing is recorded for a signed-out student either, so there
   * is nothing it could be measured against — and it is a note, not a limit.
   */
  const [startedAt, setStartedAt] = useState<Date>(() =>
    initialStartedAt ? new Date(initialStartedAt) : new Date(),
  );
  /** Seconds shown: counting down in exam mode, up in study mode. */
  const [remaining, setRemaining] = useState(() =>
    deadline === null ? 0 : secondsLeft(deadline),
  );
  const [elapsed, setElapsed] = useState(0);
  /** Set once when the clock runs out, so the auto-submit fires exactly once. */
  const timeUpRef = useRef(false);
  /**
   * The map of the test, closed to start with. One question at a time is the
   * point of this screen; the map is for going back to the ones you skipped.
   */
  const [showNav, setShowNav] = useState(false);
  const navId = useId();

  /**
   * What this test is drawn from, for the header. Naming every section would
   * outgrow the line as soon as a student picks several, so past one it says
   * how many.
   */
  const scope =
    topics.length === 0
      ? aircraftName
      : topics.length === 1
        ? topics[0]
        : `${topics.length} sections`;

  const current = questions[index];
  const isLast = index === questions.length - 1;
  const answeredCount = Object.keys(answers).length;
  const remainingUnanswered = unansweredCount(
    questions.map((question) => question.id),
    answers,
  );
  /** The revealed answer for the question on screen, once it has one. */
  const verdict = verdicts[current.id];
  /** Settled: answered and revealed, so the choice no longer moves. */
  const settled = verdict !== undefined;
  const isChecking = pending === current.id;
  const progress = useMemo(
    () => Math.round(((index + 1) / questions.length) * 100),
    [index, questions.length],
  );

  // إنشاء قائمة حالة الأسئلة للـ QuestionNavigator
  const questionStatuses: QuestionStatus[] = useMemo(
    () =>
      questions.map((question) => ({
        number: questions.indexOf(question) + 1,
        answered: question.id in answers,
        correct: question.id in verdicts ? verdicts[question.id].isCorrect : undefined,
        current: question.id === current.id,
      })),
    [questions, answers, verdicts, current],
  );

  // حساب الإحصائيات للـ TestProgress
  const stats = useMemo(
    () => ({
      correct: Object.keys(verdicts).filter((qId) => verdicts[qId].isCorrect).length,
      incorrect: Object.keys(verdicts).filter((qId) => !verdicts[qId].isCorrect).length,
      unanswered: questions.length - Object.keys(answers).length,
    }),
    [verdicts, answers, questions.length],
  );

  /**
   * Answers the question on screen, and sends it to the server.
   *
   * In study mode the reply is what the student is shown, so the call is
   * awaited before anything is revealed; until it lands the question stays
   * open, so a dropped call leaves them able to answer again rather than
   * stuck looking at a question that will not respond.
   *
   * In exam mode there is nothing to wait for on screen — the answer is
   * recorded, and the student moves on exactly as they would have before any
   * of this existed, free to come back and change their mind.
   */
  const select = useCallback(
    (questionId: string, optionId: string) => {
      // Study mode only: once revealed, the choice is made and stands. In exam
      // mode nothing has been revealed, so changing an answer is fair game.
      if (verdicts[questionId]) return;

      setPaywall(false);
      setAnswers((previous) => ({ ...previous, [questionId]: optionId }));
      if (mode === "study") setPending(questionId);

      void answerQuestion({
        aircraftCode,
        clientTestId,
        questionIds: questions.map((q) => q.id),
        questionId,
        selectedOptionId: optionId,
        mode,
      })
        .then((result) => {
          if (result.status === "paywall") {
            // Nothing was graded or recorded — undo the optimistic pick so
            // the question shows as unanswered again, the way it really is.
            setAnswers((previous) => {
              const next = { ...previous };
              delete next[questionId];
              return next;
            });
            setPaywall(true);
            return;
          }
          // The server's clock replaces the browser's guess the moment there
          // is one: the session now exists, and its startedAt is the truth.
          if (result.status === "answered" && result.startedAt) {
            setStartedAt(new Date(result.startedAt));
          }
          if (result.status === "answered" && result.expiresAt) {
            setDeadline(new Date(result.expiresAt));
          }
          // `verdict` is null in exam mode — nothing to reveal, and nothing
          // to settle. "invalid" or "failed" leave the question open too;
          // Finish still grades it from the answer key either way.
          if (result.status === "answered" && result.verdict) {
            const verdict = result.verdict;
            setVerdicts((previous) => ({ ...previous, [questionId]: verdict }));
          }
        })
        .catch(() => {
          // Offline, most likely. Same handling: leave the question open.
        })
        .finally(() => {
          setPending((current) => (current === questionId ? null : current));
        });
    },
    [aircraftCode, clientTestId, mode, questions, verdicts],
  );

  const finish = useCallback(() => {
    setError(null);
    startSubmitting(async () => {
      try {
        const graded = await submitTest({
          aircraftCode,
          clientTestId,
          answers: questions.map((question) => ({
            questionId: question.id,
            selectedOptionId: answers[question.id] ?? null,
          })),
        });
        setResult(graded);
        window.scrollTo({ top: 0 });
      } catch {
        setError("Your test could not be marked. Check your connection and try again.");
      }
    });
  }, [aircraftCode, answers, clientTestId, questions]);

  /**
   * Runs the clock, and — in exam mode — hands the test in when it reaches
   * zero.
   *
   * Ticking once a second against a fixed instant, rather than incrementing
   * or decrementing a number, is what keeps it honest across a backgrounded
   * tab or a sleeping laptop: the browser may miss a hundred ticks, and the
   * next one still shows the right time — or finds the deadline already gone
   * and submits.
   *
   * The auto-submit fires once. `timeUpRef` rather than state because a
   * re-render must not be able to fire it a second time.
   */
  useEffect(() => {
    if (result !== null) return;

    const tick = () => {
      if (deadline === null) {
        // Study mode: a note of how long this has taken, nothing more. It
        // never reaches a limit, because there is not one.
        setElapsed(secondsSince(startedAt));
        return;
      }

      const left = secondsLeft(deadline);
      setRemaining(left);
      if (left === 0 && !timeUpRef.current) {
        timeUpRef.current = true;
        finish();
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline, finish, result, startedAt]);

  /**
   * Starts a fresh test without leaving the page.
   *
   * A link back to this same URL would not do it: the browser is already here,
   * so nothing would re-render and the user would stare at their old result.
   * `router.refresh()` re-runs the server component on the same URL — this
   * test's id is now finished, so the server redirects to the same page with
   * a freshly minted one, which draws a new random set of questions. The
   * local state is cleared to match.
   */
  const restart = useCallback(() => {
    setResult(null);
    setAnswers({});
    setVerdicts({});
    setPending(null);
    setShowNav(false);
    setIndex(0);
    setError(null);
    setPaywall(false);
    window.scrollTo({ top: 0 });
    startRestarting(() => {
      router.refresh();
    });
  }, [router]);

  if (result) {
    return (
      <ResultScreen
        aircraftCode={aircraftCode}
        aircraftName={aircraftName}
        result={result}
        saveStatus={result.saveStatus}
        onRestart={restart}
      />
    );
  }

  if (isRestarting) {
    return (
      <Card className="text-center">
        <p className="text-sm text-muted-foreground">Picking a new set of questions…</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* المحتوى الرئيسي */}
      <div className="lg:col-span-2">
        <div>
          <div className="mb-6">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                {aircraftCode} · {scope}
                {/* Worth saying plainly: it changes whether an answer can still be
                    changed, which a student needs to know before they answer. */}
                {mode === "exam" ? (
                  <span className="text-muted-foreground"> · Exam</span>
                ) : null}
              </p>
              <p className="flex items-baseline gap-3 text-sm text-muted-foreground">
                {deadline !== null ? (
                  <span
                    // Announced politely rather than on every tick: a screen
                    // reader reading out each second would be unusable.
                    aria-live="off"
                    className={`font-mono font-semibold tabular-nums ${
                      // The last minute is when it starts to matter.
                      remaining <= 60 ? "text-incorrect" : "text-foreground"
                    }`}
                  >
                    <span className="sr-only">Time remaining: </span>
                    {formatClock(remaining)}
                  </span>
                ) : (
                  // Study mode: how long this has taken so far, and nothing
                  // hangs on it. Deliberately quieter than the exam countdown —
                  // same typeface, muted rather than bold, and it never turns
                  // red, because there is nothing to warn about.
                  <span aria-live="off" className="font-mono tabular-nums">
                    <span className="sr-only">Time taken so far: </span>
                    {formatClock(elapsed)}
                  </span>
                )}
                <span>
                  Question {index + 1} of {questions.length}
                </span>
              </p>
            </div>
            <div
              className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted"
              role="progressbar"
              aria-valuenow={index + 1}
              aria-valuemin={1}
              aria-valuemax={questions.length}
              aria-label="Test progress"
            >
              <div
                className="h-full rounded-full bg-brand transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">{current.topic}</Badge>
              {current.subtopic ? <Badge>{current.subtopic}</Badge> : null}
            </div>

            <h1 className="mt-4 text-lg font-semibold leading-snug text-foreground sm:text-xl">
              {current.question}
            </h1>

            <fieldset className="mt-5" disabled={settled}>
              <legend className="sr-only">Choose one answer</legend>
              <div className="space-y-2.5">
                {current.options.map((option) => {
                  const checked = answers[current.id] === option.id;
                  // Before the verdict lands, the chosen option is simply chosen.
                  // After it, the correct one is marked whether or not it was the
                  // one picked, and a wrong pick is marked as wrong.
                  const isAnswer = verdict ? option.id === verdict.correctOptionId : false;
                  const isWrongPick = verdict ? checked && !isAnswer : false;

                  const tone = isAnswer
                    ? "border-correct bg-correct-soft"
                    : isWrongPick
                      ? "border-incorrect bg-incorrect-soft"
                      : checked
                        ? "border-brand bg-brand-soft"
                        : settled
                          ? "border-border bg-surface opacity-60"
                          : "border-border bg-surface hover:border-brand";

                  return (
                    <label
                      key={option.id}
                      className={`flex items-start gap-3 rounded-lg border p-3.5 transition ${
                        settled ? "cursor-default" : "cursor-pointer"
                      } ${tone}`}
                    >
                      <input
                        type="radio"
                        name={`question-${current.id}`}
                        value={option.id}
                        checked={checked}
                        onChange={() => select(current.id, option.id)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand)]"
                      />
                      <span className="flex flex-1 gap-2 text-sm text-foreground">
                        <span className="font-mono font-semibold uppercase text-muted-foreground">
                          {option.id}
                        </span>
                        <span className="flex-1">{option.text}</span>
                        {isAnswer ? (
                          <span className="text-xs font-semibold text-correct">Correct answer</span>
                        ) : null}
                        {isWrongPick ? (
                          <span className="text-xs font-semibold text-incorrect">Your answer</span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {isChecking ? (
              <p className="mt-4 text-sm text-muted-foreground" role="status">
                Checking your answer…
              </p>
            ) : null}

            {verdict ? (
              <div
                className={`mt-4 rounded-lg border-l-4 p-4 ${
                  verdict.isCorrect
                    ? "border-l-correct bg-correct-soft"
                    : "border-l-incorrect bg-incorrect-soft"
                }`}
                role="status"
              >
                <p
                  className={`text-sm font-semibold ${
                    verdict.isCorrect ? "text-correct" : "text-incorrect"
                  }`}
                >
                  {verdict.isCorrect ? "Correct" : "Not quite"}
                </p>
                <p className="mt-2 text-sm text-foreground">{verdict.explanation}</p>
                {verdict.reference ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Reference: {verdict.reference}
                  </p>
                ) : null}
              </div>
            ) : null}
          </Card>

          {deadline !== null && remaining === 0 ? (
            <p
              className="mt-4 rounded-lg bg-incorrect-soft px-4 py-3 text-sm font-medium text-incorrect"
              role="alert"
            >
              Time is up — handing in your test.
            </p>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-lg bg-incorrect-soft px-4 py-3 text-sm text-incorrect" role="alert">
              {error}
            </p>
          ) : null}

          {paywall ? (
            <div
              className="mt-4 rounded-lg border-l-4 border-l-brand bg-brand-soft p-4"
              role="alert"
            >
              <p className="text-sm font-semibold text-foreground">
                You&apos;ve used your free questions on {aircraftCode}.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Subscribe for unlimited questions on every aircraft.
              </p>
              <Link
                href="/upgrade"
                className="mt-3 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-strong"
              >
                Upgrade
              </Link>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIndex((value) => Math.max(0, value - 1))}
              disabled={index === 0 || isSubmitting}
              className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
            >
              ← Previous
            </button>

            {isLast ? (
              <button
                type="button"
                onClick={finish}
                disabled={isSubmitting}
                className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Marking…" : "Finish test"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIndex((value) => Math.min(questions.length - 1, value + 1))}
                disabled={isSubmitting}
                className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
              >
                Next →
              </button>
            )}
          </div>

          <div id={navId}>
            {showNav ? (
              <QuestionNav
                questions={questions}
                answers={answers}
                verdicts={verdicts}
                current={index}
                onJump={(to) => {
                  setIndex(to);
                  window.scrollTo({ top: 0 });
                }}
              />
            ) : null}
          </div>

          <p className="mt-6 text-center">
            <Link
              href={`/aircraft/${aircraftCode}`}
              className="text-sm text-muted-foreground hover:text-brand hover:underline"
            >
              Abandon test
            </Link>
          </p>
        </div>
      </div>

      {/* الشريط الجانبي - المكونات الجديدة */}
      <div className="space-y-6">
        {/* إحصائيات التقدم */}
        <div className="rounded-lg bg-surface p-4">
          <TestProgress
            correct={stats.correct}
            incorrect={stats.incorrect}
            unanswered={stats.unanswered}
          />
        </div>

        {/* مُنقّل الأسئلة */}
        <div className="rounded-lg bg-surface p-4">
          <QuestionNavigator
            questions={questionStatuses}
            onQuestionSelect={(number) => {
              setIndex(number - 1);
              window.scrollTo({ top: 0 });
            }}
          />
        </div>
      </div>
    </div>
  );
}
