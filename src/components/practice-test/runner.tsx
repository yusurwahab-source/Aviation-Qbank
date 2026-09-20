"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { FlagButton } from "@/components/flag-button";
import { QuestionIdTag } from "@/components/question-id-tag";
import { QuestionNote } from "@/components/question-note";
import { ReportQuestionButton } from "@/components/report-question-button";
import { Badge, Card } from "@/components/ui";
import { optionIndexForKey, shouldHandleShortcut } from "@/lib/keyboard-shortcuts";
import type {
  AnswerVerdict,
  PracticeQuestion,
  PracticeTestActions,
  PracticeTestResult,
  ReportReason,
} from "@/lib/practice-test-types";
import { unansweredCount } from "@/lib/question-status";
import { DEFAULT_PASS_MARK_PERCENT } from "@/lib/settings";
import {
  buildTestHrefFor,
  DEFAULT_TEST_MODE,
  formatClock,
  secondsLeft,
  secondsSince,
  type TestMode,
} from "@/lib/test-options";

import { QuestionNav } from "./question-nav";
import { ResultScreen } from "./result-screen";
import { ShortcutsOverlay } from "./shortcuts-overlay";

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
  /** The six server actions this test runs against, supplied by the route
   * hosting this runner — an aircraft's or a class rating's own
   * `actions.ts`. The runner has no idea which. */
  actions,
  /** Where "Abandon test" and "Back to dashboard" go back to. */
  backHref,
  /**
   * `/aircraft` or `/class` — builds the "retake wrong questions" / "new
   * test on weakest system" links on the result screen. A plain string, not
   * a `buildRetakeHref` function prop: see the note on `basePath` in
   * `TestBuilder` for why a server page may not hand this component a pure
   * function.
   */
  basePath,
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
  /** Flags and notes are a signed-in student's own study aids; a signed-out
   * visitor practises exactly as before, with neither control shown. */
  isSignedIn = false,
  /** Which of these questions are already flagged, for the map and the
   * button's starting state on resume. */
  initialFlaggedIds = [],
  /** The results screen's pass/fail line. A label on the score, set by the
   * owner in Settings — nothing about grading depends on it. */
  passMarkPercent = DEFAULT_PASS_MARK_PERCENT,
}: {
  aircraftCode: string;
  aircraftName: string;
  questions: PracticeQuestion[];
  /** The sections the student chose. Empty means the whole bank. */
  topics?: string[];
  actions: PracticeTestActions;
  backHref: string;
  basePath: string;
  clientTestId: string;
  initialAnswers?: Record<string, string>;
  initialVerdicts?: Record<string, AnswerVerdict>;
  mode?: TestMode;
  timeLimitSeconds?: number | null;
  initialStartedAt?: string | null;
  initialExpiresAt?: string | null;
  isSignedIn?: boolean;
  initialFlaggedIds?: string[];
  passMarkPercent?: number;
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
  const [result, setResult] = useState<PracticeTestResult | null>(null);
  /** Captured once, at Finish — see the note beside `finish` below. */
  const [finishTiming, setFinishTiming] = useState<{
    takenSeconds: number;
    limitSeconds: number | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  /**
   * Set when the server refuses to mark a question: a signed-in student has
   * reached the free allowance, a signed-out visitor has spent their
   * preview, or too many signed-out answers have come from one address too
   * quickly. All three leave the question unanswered — nothing was graded or
   * recorded — so `select` below reverts the optimistic answer it had
   * already shown, and all three want to say something different about what
   * to do next, which is why this is which-one rather than a boolean.
   */
  const [gate, setGate] = useState<
    null | { kind: "paywall" } | { kind: "preview" } | { kind: "rate-limited"; retryAfter: string }
  >(null);
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
  const [showShortcuts, setShowShortcuts] = useState(false);
  /** Set once Finish is pressed with questions still unanswered, so the
   * warning shows once rather than blocking every click on an empty test. */
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [flaggedIds, setFlaggedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialFlaggedIds),
  );
  /** Bumped to force a question's note editor open from the `N` shortcut —
   * see the note beside `QuestionNote`'s own `forceOpenToken` prop. */
  const [noteOpenToken, setNoteOpenToken] = useState(0);
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
  const isFirst = index === 0;
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

  /**
   * How much of the clock is left, as a fraction of the whole — what the
   * colour below reacts to. Derived from `deadline` and `startedAt` rather
   * than from the `timeLimitSeconds` prop, which is only ever the *first*
   * render's figure: after the session exists, both of those state values
   * are the server's own, so this stays correct across a resume too.
   */
  const remainingFraction = useMemo(() => {
    if (deadline === null) return null;
    const total = (deadline.getTime() - startedAt.getTime()) / 1000;
    return total > 0 ? remaining / total : 0;
  }, [deadline, startedAt, remaining]);

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

      setGate(null);
      setAnswers((previous) => ({ ...previous, [questionId]: optionId }));
      if (mode === "study") setPending(questionId);

      void actions.answerQuestion({
        aircraftCode,
        clientTestId,
        questionIds: questions.map((q) => q.id),
        questionId,
        selectedOptionId: optionId,
        mode,
        topics,
      })
        .then((result) => {
          if (
            result.status === "paywall" ||
            result.status === "preview-exhausted" ||
            result.status === "rate-limited"
          ) {
            // Nothing was graded or recorded — undo the optimistic pick so
            // the question shows as unanswered again, the way it really is.
            setAnswers((previous) => {
              const next = { ...previous };
              delete next[questionId];
              return next;
            });
            setGate(
              result.status === "paywall"
                ? { kind: "paywall" }
                : result.status === "preview-exhausted"
                  ? { kind: "preview" }
                  : { kind: "rate-limited", retryAfter: result.retryAfter },
            );
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
    [actions, aircraftCode, clientTestId, mode, questions, topics, verdicts],
  );

  const finish = useCallback(() => {
    setError(null);
    setConfirmFinish(false);
    // Captured here, once, rather than read again on the results screen:
    // `startedAt` and `deadline` are still ticking state that a re-render
    // after this moment must not be allowed to move. Time taken is always
    // measured against `startedAt` regardless of mode; the limit is only
    // ever present in exam mode, derived from the same two values the
    // countdown itself uses.
    setFinishTiming({
      takenSeconds: secondsSince(startedAt),
      limitSeconds:
        deadline === null ? null : Math.round((deadline.getTime() - startedAt.getTime()) / 1000),
    });
    startSubmitting(async () => {
      try {
        const graded = await actions.submitTest({
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
  }, [actions, aircraftCode, answers, clientTestId, deadline, questions, startedAt]);

  /** What the Finish button actually does: ask first if anything was left
   * unanswered, since an unanswered question counts as wrong and that is
   * easy to do by accident on the last question of a long test. */
  const requestFinish = useCallback(() => {
    if (remainingUnanswered > 0) {
      setConfirmFinish(true);
      return;
    }
    finish();
  }, [remainingUnanswered, finish]);

  const goPrevious = useCallback(() => {
    setIndex((value) => Math.max(0, value - 1));
    window.scrollTo({ top: 0 });
  }, []);

  const goNext = useCallback(() => {
    setIndex((value) => Math.min(questions.length - 1, value + 1));
    window.scrollTo({ top: 0 });
  }, [questions.length]);

  /**
   * Toggles a flag on any question in this test, not only the one on
   * screen — the results review lets a student flag any of them, after the
   * fact, from the same `flaggedIds` this runner has been tracking all
   * along, so there is no separate fetch for the review screen to do.
   */
  const toggleFlagFor = useCallback(
    (questionId: string) => {
      if (!isSignedIn) return;
      const nextFlagged = !flaggedIds.has(questionId);

      setFlaggedIds((previous) => {
        const next = new Set(previous);
        if (nextFlagged) next.add(questionId);
        else next.delete(questionId);
        return next;
      });

      void actions.toggleFlag({ questionId, aircraftCode }).then((result) => {
        // Reconcile only on a genuine disagreement with the server — the
        // common case must not cause a visible flicker back.
        if ("flagged" in result && result.flagged !== nextFlagged) {
          setFlaggedIds((previous) => {
            const next = new Set(previous);
            if (result.flagged) next.add(questionId);
            else next.delete(questionId);
            return next;
          });
        }
      });
    },
    [actions, aircraftCode, flaggedIds, isSignedIn],
  );

  const toggleCurrentFlag = useCallback(
    () => toggleFlagFor(current.id),
    [current, toggleFlagFor],
  );

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
   * Keyboard shortcuts — desktop's whole reason for the discreet hint below
   * the action row. `shouldHandleShortcut` is what keeps a letter typed into
   * the note editor from also flagging the question it belongs to.
   */
  useEffect(() => {
    if (result !== null) return;

    function onKeyDown(event: KeyboardEvent) {
      if (!shouldHandleShortcut({ ...event, target: event.target as HTMLElement | null })) return;

      if (showShortcuts) {
        if (event.key === "Escape" || event.key === "?") setShowShortcuts(false);
        return;
      }
      if (confirmFinish) return; // the dialog's own buttons own the keyboard here.

      if (event.key === "?") {
        setShowShortcuts(true);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        if (isLast) requestFinish();
        else goNext();
        return;
      }
      if (event.key === "ArrowLeft") {
        goPrevious();
        return;
      }
      if (event.key === "ArrowRight") {
        goNext();
        return;
      }
      if (event.key.toLowerCase() === "f") {
        toggleCurrentFlag();
        return;
      }
      if (event.key.toLowerCase() === "n") {
        if (isSignedIn) setNoteOpenToken((value) => value + 1);
        return;
      }

      if (settled) return;
      const optionIndex = optionIndexForKey(event.key);
      const option = optionIndex === null ? undefined : current.options[optionIndex];
      if (option) select(current.id, option.id);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [
    confirmFinish,
    current,
    goNext,
    goPrevious,
    isLast,
    isSignedIn,
    requestFinish,
    result,
    select,
    settled,
    showShortcuts,
    toggleCurrentFlag,
  ]);

  /**
   * Swiping between questions on a touch screen. A horizontal gesture only —
   * `dx` has to clear both an absolute floor and the vertical movement by a
   * margin, or a scroll and a swipe would fight over the same touch.
   */
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  function onTouchStart(event: React.TouchEvent) {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }

  function onTouchEnd(event: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;

    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

    if (dx < 0 && !isLast) goNext();
    else if (dx > 0 && !isFirst) goPrevious();
  }

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
    setFinishTiming(null);
    setAnswers({});
    setVerdicts({});
    setPending(null);
    setShowNav(false);
    setIndex(0);
    setError(null);
    setGate(null);
    window.scrollTo({ top: 0 });
    startRestarting(() => {
      router.refresh();
    });
  }, [router]);

  if (result && finishTiming) {
    return (
      <ResultScreen
        aircraftCode={aircraftCode}
        aircraftName={aircraftName}
        result={result}
        saveStatus={result.saveStatus}
        onRestart={restart}
        isSignedIn={isSignedIn}
        passMarkPercent={passMarkPercent}
        timeTakenSeconds={finishTiming.takenSeconds}
        timeLimitSeconds={finishTiming.limitSeconds}
        flaggedIds={flaggedIds}
        onToggleFlag={toggleFlagFor}
        withheld={result.withheld}
        actions={actions}
        backHref={backHref}
        buildRetakeHref={(options) => buildTestHrefFor(basePath, aircraftCode, options)}
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
    <div className="pb-24 lg:pb-0">
      <div className="mb-6">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">
            {aircraftCode} · {scope}
            {/* Worth saying plainly: it changes whether an answer can still be
                changed, which a student needs to know before they answer. */}
            {mode === "exam" ? <span className="text-muted-foreground"> · Exam</span> : null}
          </p>
          <p className="flex items-baseline gap-3 text-sm text-muted-foreground">
            {deadline !== null ? (
              <span
                // Announced politely rather than on every tick: a screen
                // reader reading out each second would be unusable.
                aria-live="off"
                className={`font-mono font-semibold tabular-nums ${
                  // Amber with a fifth of the clock left, red with a
                  // twentieth — prominent, not alarming: colour only, no
                  // motion, and nothing changes about what the numbers say.
                  remainingFraction !== null && remainingFraction <= 0.05
                    ? "text-incorrect"
                    : remainingFraction !== null && remainingFraction <= 0.2
                      ? "text-warning"
                      : "text-foreground"
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

      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">{current.topic}</Badge>
            {current.subtopic ? <Badge>{current.subtopic}</Badge> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isSignedIn ? (
              <FlagButton flagged={flaggedIds.has(current.id)} onToggle={toggleCurrentFlag} />
            ) : null}
            <ReportQuestionButton
              key={current.id}
              onSubmit={({ reason, comment }) =>
                actions.reportQuestion({
                  questionId: current.id,
                  reason: reason as ReportReason,
                  comment,
                })
              }
            />
          </div>
        </div>

        <h1 className="question-text mt-4 font-semibold text-foreground">{current.question}</h1>

        {current.media ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.media}
            alt="Diagram for this question"
            className="mt-4 max-h-72 w-full rounded-lg border border-border object-contain"
          />
        ) : null}

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
                  <span className="flex flex-1 flex-wrap gap-x-2 gap-y-1 font-reading text-base text-foreground">
                    <span className="font-mono font-semibold uppercase text-muted-foreground">
                      {option.id}
                    </span>
                    <span className="min-w-0 flex-1 basis-0">{option.text}</span>
                    {/* Never colour alone: each verdict carries its own icon,
                        so the state reads the same to someone who cannot
                        tell red from green as it does to everyone else. */}
                    {isAnswer ? (
                      <span className="basis-full text-xs font-semibold text-correct sm:basis-auto">
                        <CorrectIcon /> Correct answer
                      </span>
                    ) : null}
                    {isWrongPick ? (
                      <span className="basis-full text-xs font-semibold text-incorrect sm:basis-auto">
                        <IncorrectIcon /> Your answer
                      </span>
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
              verdict.isCorrect ? "border-l-correct bg-correct-soft" : "border-l-incorrect bg-incorrect-soft"
            }`}
            role="status"
          >
            <p
              className={`flex items-center gap-1.5 text-sm font-semibold ${
                verdict.isCorrect ? "text-correct" : "text-incorrect"
              }`}
            >
              {verdict.isCorrect ? <CorrectIcon /> : <IncorrectIcon />}
              {verdict.isCorrect ? "Correct" : "Not quite"}
            </p>
            <p className="mt-2 font-reading text-base text-foreground">{verdict.explanation}</p>
            {verdict.reference ? (
              <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
                  <path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H19" />
                </svg>
                Reference
                <span className="rounded border border-border bg-surface-muted px-2 py-0.5 font-mono text-foreground">
                  {verdict.reference}
                </span>
              </p>
            ) : null}
          </div>
        ) : null}

        {isSignedIn ? (
          <QuestionNote
            key={current.id}
            hasNote={false}
            onLoad={() => actions.loadNote(current.id)}
            onSave={(body) => actions.saveNote({ questionId: current.id, aircraftCode, body })}
            forceOpenToken={noteOpenToken}
            textareaId={`note-${current.id}`}
            className="mt-4"
          />
        ) : null}

        <div className="mt-4 border-t border-border pt-3 text-right">
          <QuestionIdTag id={current.id} />
        </div>
      </Card>
      </div>

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

      {gate ? (
        <div className="mt-4 rounded-lg border-l-4 border-l-brand bg-brand-soft p-4" role="alert">
          {gate.kind === "paywall" ? (
            <>
              <p className="text-sm font-semibold text-foreground">
                You&apos;ve used your free questions on {aircraftCode}.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Subscribe for unlimited questions on every aircraft.
              </p>
              <Link
                href="/upgrade"
                className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid transition hover:bg-brand-strong"
              >
                Upgrade
              </Link>
            </>
          ) : gate.kind === "preview" ? (
            <>
              <p className="text-sm font-semibold text-foreground">
                That&apos;s the {aircraftCode} preview.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a free account to keep going — you&apos;ll get more questions on every
                aircraft, and your results, flags and notes are kept as you go.
              </p>
              <Link
                href="/signup"
                className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid transition hover:bg-brand-strong"
              >
                Create a free account
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-foreground">
                Too many answers from this connection.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try again {gate.retryAfter}, or sign in — this limit only applies to practice
                without an account.
              </p>
              <Link
                href="/login"
                className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid transition hover:bg-brand-strong"
              >
                Log in
              </Link>
            </>
          )}
        </div>
      ) : null}

      {/* Desktop navigation — the sticky bar below covers the same ground on
          a phone, where these buttons would sit under a thumb reaching all
          the way up the screen. */}
      <div className="mt-5 hidden flex-wrap items-center justify-between gap-3 lg:flex">
        <button
          type="button"
          onClick={goPrevious}
          disabled={isFirst || isSubmitting}
          className="min-h-11 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
        >
          ← Previous
        </button>

        {isLast ? (
          <button
            type="button"
            onClick={requestFinish}
            disabled={isSubmitting}
            className="min-h-11 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-on-solid transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Marking…" : "Finish test"}
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            disabled={isSubmitting}
            className="min-h-11 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-on-solid transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            Next →
          </button>
        )}
      </div>

      <p className="mt-3 hidden text-center text-xs text-subtle-foreground lg:block">
        <button
          type="button"
          onClick={() => setShowShortcuts(true)}
          className="link-standalone underline decoration-dotted underline-offset-2 hover:text-brand"
        >
          Press <kbd className="font-mono">?</kbd> for keyboard shortcuts
        </button>
      </p>

      <div id={navId}>
        {showNav ? (
          <QuestionNav
            questions={questions}
            answers={answers}
            verdicts={verdicts}
            flagged={flaggedIds}
            current={index}
            onJump={(to) => {
              setIndex(to);
              window.scrollTo({ top: 0 });
            }}
            onClose={() => setShowNav(false)}
          />
        ) : null}
      </div>

      <div className="mt-4 hidden text-center lg:block">
        <button
          type="button"
          onClick={() => setShowNav((value) => !value)}
          aria-expanded={showNav}
          aria-controls={navId}
          className="link-standalone text-sm font-medium text-brand hover:underline"
        >
          {showNav ? "Hide" : "Show"} all questions
        </button>
      </div>

      <p className="mt-6 text-center">
        <Link
          href={backHref}
          className="link-standalone text-sm text-muted-foreground hover:text-brand hover:underline"
        >
          Abandon test
        </Link>
      </p>

      {/* Mobile: a sticky bar a thumb can always reach, and the question map
          opens as a sheet from `QuestionNav` itself rather than a separate
          toggle here. */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface-elevated px-4 pt-3 lg:hidden">
        <div className="flex items-center justify-between gap-2 pb-3">
          <button
            type="button"
            onClick={goPrevious}
            disabled={isFirst || isSubmitting}
            aria-label="Previous question"
            className="tap-target inline-flex items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            ←
          </button>

          <button
            type="button"
            onClick={() => setShowNav(true)}
            aria-expanded={showNav}
            aria-controls={navId}
            className="tap-target flex-1 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-muted-foreground"
          >
            {index + 1} / {questions.length}
            {remainingUnanswered > 0 ? ` · ${remainingUnanswered} left` : ""}
          </button>

          {isLast ? (
            <button
              type="button"
              onClick={requestFinish}
              disabled={isSubmitting}
              className="tap-target inline-flex items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "…" : "Finish"}
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={isSubmitting}
              aria-label="Next question"
              className="tap-target inline-flex items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid disabled:cursor-not-allowed disabled:opacity-60"
            >
              →
            </button>
          )}
        </div>
      </div>

      {confirmFinish ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Cancel"
            onClick={() => setConfirmFinish(false)}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label="Finish test"
            className="relative w-full max-w-sm rounded-xl border border-border bg-surface-elevated p-5 shadow-md"
          >
            <p className="text-sm font-semibold text-foreground">
              {remainingUnanswered} {remainingUnanswered === 1 ? "question is" : "questions are"}{" "}
              still unanswered.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              An unanswered question counts as wrong. Finish anyway, or go back and answer the
              rest?
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmFinish(false)}
                className="min-h-11 flex-1 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand"
              >
                Keep going
              </button>
              <button
                type="button"
                onClick={finish}
                className="min-h-11 flex-1 rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid transition hover:bg-brand-strong"
              >
                Finish anyway
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showShortcuts ? <ShortcutsOverlay onClose={() => setShowShortcuts(false)} /> : null}
    </div>
  );
}

function CorrectIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="inline h-3.5 w-3.5 shrink-0 align-[-2px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="8" />
      <path d="m6.5 10 2.5 2.5 4.5-5" />
    </svg>
  );
}

function IncorrectIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="inline h-3.5 w-3.5 shrink-0 align-[-2px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="8" />
      <path d="M7.5 7.5 12.5 12.5M12.5 7.5 7.5 12.5" />
    </svg>
  );
}
