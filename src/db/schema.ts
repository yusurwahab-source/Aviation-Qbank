import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import type { QuestionOption } from "@/content/schema";

/**
 * Database schema.
 *
 * Everything here is keyed by aircraft from day one. There is no "the"
 * aircraft anywhere in the design: adding a second type is a content change,
 * not a schema change.
 */

export const aircraftStatus = pgEnum("aircraft_status", ["active", "coming_soon"]);
export const questionStatus = pgEnum("question_status", ["draft", "published"]);
/** Mirrors `TEST_MODES` in `src/lib/test-options.ts` — the one other place this shape exists. */
export const testMode = pgEnum("test_mode", ["study", "exam"]);

export const aircraft = pgTable("aircraft", {
  /** Short type code, e.g. DA40. Also the URL segment: /aircraft/DA40. */
  code: varchar("code", { length: 8 }).primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  manufacturer: varchar("manufacturer", { length: 120 }).notNull(),
  variant: varchar("variant", { length: 60 }),
  description: text("description").notNull(),
  status: aircraftStatus("status").notNull().default("active"),
  /** Controls the order of the aircraft picker; ties break alphabetically. */
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const questions = pgTable(
  "questions",
  {
    /** Human-readable id straight from the content file, e.g. DA40-ELEC-0042. */
    id: varchar("id", { length: 40 }).primaryKey(),
    aircraftCode: varchar("aircraft_code", { length: 8 })
      .notNull()
      .references(() => aircraft.code, { onDelete: "cascade" }),
    topic: varchar("topic", { length: 60 }).notNull(),
    subtopic: varchar("subtopic", { length: 60 }),
    question: text("question").notNull(),
    /** 2-5 choices, each `{ id, text }`. Order is the order shown to the user. */
    options: jsonb("options").$type<QuestionOption[]>().notNull(),
    correct: varchar("correct", { length: 4 }).notNull(),
    explanation: text("explanation").notNull(),
    reference: text("reference"),
    /** Reserved for question images. Not used yet. */
    media: text("media"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    status: questionStatus("status").notNull().default("draft"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Every user-facing query starts "published questions for this aircraft".
    index("questions_aircraft_status_idx").on(table.aircraftCode, table.status),
    // Topic breakdowns and topic filters (Phase 4 and 5).
    index("questions_aircraft_status_topic_idx").on(
      table.aircraftCode,
      table.status,
      table.topic,
    ),
  ],
);

export type AircraftRow = typeof aircraft.$inferSelect;
export type AircraftInsert = typeof aircraft.$inferInsert;
export type QuestionRow = typeof questions.$inferSelect;
export type QuestionInsert = typeof questions.$inferInsert;

/**
 * Class ratings — Single-Engine Piston, Multi-Engine Piston, and so on —
 * sitting beside `aircraft` as a genuinely separate table pair rather than a
 * "kind" column grafted onto it. Deliberately: `aircraft`/`questions` stay
 * exactly the single-type-rating model this file has always described, and a
 * class rating's own bank (`classQuestions`) never joins to `aircraft` or
 * `questions`.
 *
 * They share everything downstream of content, though. `attempts`,
 * `test_sessions`, `question_flags`, `question_notes` and the free-tier count
 * in `attempts` are keyed by a plain `varchar` code with no foreign key (see
 * the note on `attempts` below) precisely so nothing there cares which table
 * a code came from — a class rating's code is written into those same
 * columns, and every report, resume, flag, note and free-tier check that
 * already reads them keeps working unchanged.
 */
export const classRatings = pgTable("class_ratings", {
  /** Short code, e.g. SEP. Also the URL segment: /class/SEP. */
  code: varchar("code", { length: 8 }).primaryKey(),
  /** e.g. "Single-Engine Piston". */
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description").notNull(),
  status: aircraftStatus("status").notNull().default("active"),
  /** Controls the order of the class picker; ties break alphabetically. */
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const classQuestions = pgTable(
  "class_questions",
  {
    /** Human-readable id straight from the content file, e.g. SEP-SYSTEMS-0001. */
    id: varchar("id", { length: 40 }).primaryKey(),
    classCode: varchar("class_code", { length: 8 })
      .notNull()
      .references(() => classRatings.code, { onDelete: "cascade" }),
    topic: varchar("topic", { length: 60 }).notNull(),
    subtopic: varchar("subtopic", { length: 60 }),
    question: text("question").notNull(),
    options: jsonb("options").$type<QuestionOption[]>().notNull(),
    correct: varchar("correct", { length: 4 }).notNull(),
    explanation: text("explanation").notNull(),
    reference: text("reference"),
    media: text("media"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    status: questionStatus("status").notNull().default("draft"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("class_questions_class_status_idx").on(table.classCode, table.status),
    index("class_questions_class_status_topic_idx").on(
      table.classCode,
      table.status,
      table.topic,
    ),
  ],
);

export type ClassRatingRow = typeof classRatings.$inferSelect;
export type ClassRatingInsert = typeof classRatings.$inferInsert;
export type ClassQuestionRow = typeof classQuestions.$inferSelect;
export type ClassQuestionInsert = typeof classQuestions.$inferInsert;

/**
 * Flying Knowledge subjects — IFR, Air Law, Meteorology, Navigation, and so
 * on — the third content tree, beside `aircraft` and `classRatings`. Nothing
 * here is tied to an aircraft, so a subject is the top-level entity the way
 * an aircraft or a class rating is: `flyingKnowledgeSubjects` sits beside
 * `flyingKnowledgeQuestions` in exactly the shape `classRatings` sits beside
 * `classQuestions`, and for the same reason — see the note there.
 *
 * Everything downstream of a question id is shared unchanged, the same as
 * for the other two trees: `attempts`, `test_sessions`, `question_flags` and
 * `question_notes` are written with a subject's code in their plain
 * `aircraftCode` column, with no foreign key and no idea which tree it came
 * from.
 *
 * One thing does not carry over: Flying Knowledge is free in full, by
 * product decision (see `CLAUDE.md`) — nothing here is ever checked against
 * `FREE_QUESTIONS_PER_AIRCRAFT` or a subscription, so `subscriptions` and
 * `preview_attempts` are never consulted for a Flying Knowledge code.
 */
export const flyingKnowledgeSubjects = pgTable("flying_knowledge_subjects", {
  /** Short code, e.g. IFR. Also the URL segment: /flying-knowledge/IFR. */
  code: varchar("code", { length: 8 }).primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description").notNull(),
  status: aircraftStatus("status").notNull().default("active"),
  /** Controls the order of the subject picker; ties break alphabetically. */
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const flyingKnowledgeQuestions = pgTable(
  "flying_knowledge_questions",
  {
    /** Human-readable id straight from the content file, e.g. IFR-APPR-0001. */
    id: varchar("id", { length: 40 }).primaryKey(),
    subjectCode: varchar("subject_code", { length: 8 })
      .notNull()
      .references(() => flyingKnowledgeSubjects.code, { onDelete: "cascade" }),
    topic: varchar("topic", { length: 60 }).notNull(),
    subtopic: varchar("subtopic", { length: 60 }),
    question: text("question").notNull(),
    options: jsonb("options").$type<QuestionOption[]>().notNull(),
    correct: varchar("correct", { length: 4 }).notNull(),
    explanation: text("explanation").notNull(),
    reference: text("reference"),
    media: text("media"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    status: questionStatus("status").notNull().default("draft"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("flying_knowledge_questions_subject_status_idx").on(table.subjectCode, table.status),
    index("flying_knowledge_questions_subject_status_topic_idx").on(
      table.subjectCode,
      table.status,
      table.topic,
    ),
  ],
);

export type FlyingKnowledgeSubjectRow = typeof flyingKnowledgeSubjects.$inferSelect;
export type FlyingKnowledgeSubjectInsert = typeof flyingKnowledgeSubjects.$inferInsert;
export type FlyingKnowledgeQuestionRow = typeof flyingKnowledgeQuestions.$inferSelect;
export type FlyingKnowledgeQuestionInsert = typeof flyingKnowledgeQuestions.$inferInsert;

/**
 * Accounts.
 *
 * Email and password only, as agreed for Phase 2. `passwordHash` holds the
 * self-describing scrypt string from `src/lib/password.ts`, never a password.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Always stored trimmed and lowercased; see `normaliseEmail`. */
    email: varchar("email", { length: 254 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    /**
     * Null until the owner of the inbox has opened the emailed link. Existing
     * accounts start null too — nobody has proved anything yet — and nothing
     * is taken away from an unverified account except subscribing.
     */
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    /**
     * Set when the student has unsubscribed from messages the owner sends.
     * Never affects the emails an account needs to function (a password
     * reset, a verification link, a security notice) — only broadcasts.
     */
    broadcastOptOutAt: timestamp("broadcast_opt_out_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // One account per address. The database enforces this, not just the form:
    // two simultaneous sign-ups for the same email must not both succeed.
    uniqueIndex("users_email_unique").on(table.email),
    // The signup half of the owner insights funnel: "signups in the last N
    // days" is a range scan on this column alone.
    index("users_created_at_idx").on(table.createdAt),
  ],
);

/**
 * Logged-in sessions.
 *
 * Sessions live in the database rather than in a signed token so that logging
 * out actually revokes access: the row is deleted and the session is gone
 * everywhere, immediately.
 *
 * `id` is the SHA-256 of the cookie value, never the cookie value itself, so
 * someone who reads this table still cannot pose as a logged-in user.
 */
export const sessions = pgTable(
  "sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // "Log out everywhere" and cleaning up a user's sessions on delete.
    index("sessions_user_id_idx").on(table.userId),
    // Sweeping expired rows.
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);

/**
 * One-time links for setting a forgotten password.
 *
 * Shaped exactly like `sessions`, and for exactly the same reason: `id` is the
 * SHA-256 of the token in the emailed link, never the token itself. Someone
 * who reads this table learns that a reset was requested and nothing more —
 * they cannot construct the link.
 *
 * `usedAt` is what makes a link one-time. It is set rather than the row
 * deleted, so a second click on the same link can be told apart from a link
 * that never existed, and answered accurately.
 */
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    /** Null while the link is still good. Set the moment it is spent. */
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Retiring a user's outstanding links when a new one is issued, and
    // cleaning up on delete.
    index("password_reset_tokens_user_id_idx").on(table.userId),
    // Sweeping rows that have aged out.
    index("password_reset_tokens_expires_at_idx").on(table.expiresAt),
  ],
);

/**
 * Email verification links: the same design as `passwordResetTokens`, for the
 * same reasons — 256 bits of randomness, only the SHA-256 stored, one live
 * link per account, spent atomically — with a longer life (a day), because
 * nothing is at stake if one outlives its welcome.
 */
export const emailVerificationTokens = pgTable(
  "email_verification_tokens",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("email_verification_tokens_user_id_idx").on(table.userId),
    index("email_verification_tokens_expires_at_idx").on(table.expiresAt),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;
export type SessionRow = typeof sessions.$inferSelect;
export type PasswordResetTokenRow = typeof passwordResetTokens.$inferSelect;

/**
 * One practice test, finished or still in progress.
 *
 * A row appears as soon as a signed-in user answers their first question —
 * not only once they press Finish. `completedAt` is null while the test is
 * still being taken and is set exactly once, when it is submitted. That is
 * what lets a mid-test refresh resume the same test instead of losing it, and
 * what lets an abandoned test still contribute the answers it did record
 * rather than nothing at all.
 *
 * `questionIds` is the ordered set the student was actually given. It is what
 * a resume reloads by id instead of drawing a new random set, and it is
 * intentionally not a foreign key to `questions` for the same reason
 * `attempts.questionId` is not one — see the note below.
 */
export const testSessions = pgTable(
  "test_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /**
     * Snapshot, not a foreign key — see the note on `attempts.questionId`.
     * Deleting an aircraft's content must never delete a pilot's history.
     */
    aircraftCode: varchar("aircraft_code", { length: 8 }).notNull(),
    /**
     * Idempotency key generated by the browser when the test starts, carried
     * in the test page's URL for the rest of the test's life. A double-click
     * or a retried request must not record the same test twice, which would
     * quietly corrupt every report built on this data.
     */
    clientTestId: varchar("client_test_id", { length: 64 }).notNull(),
    questionCount: smallint("question_count").notNull(),
    /** The exact questions given, in the order shown. Empty only pre-migration. */
    questionIds: text("question_ids").array().notNull().default(sql`'{}'::text[]`),
    /**
     * When the clock started, for a timed test. Set once, with the row, and
     * never moved — that is the whole point: a refresh re-reads this rather
     * than starting a fresh countdown in the browser.
     *
     * Null on an untimed test, and on every row written before timing existed.
     */
    startedAt: timestamp("started_at", { withTimezone: true }),
    /**
     * How long the student gave themselves, in seconds. Null means untimed.
     * Stored alongside `startedAt` rather than as a deadline so the two
     * always agree about which test they describe.
     */
    timeLimitSeconds: integer("time_limit_seconds"),
    /**
     * Study or exam, captured once when the session is first written and
     * never moved. `parseTestMode` still reads `?mode=` for a *fresh* test —
     * before the first answer there is no row for this to live on — but a
     * *resumed* test reads it from here, not the URL. That is not cosmetic:
     * `?mode=study` on a resumed test's URL used to decide whether
     * already-answered questions had their key re-sent, so a resume link
     * that dropped `mode=exam` would have handed back an exam's answers as
     * if it had been study mode all along. See the note on `findSession`.
     *
     * Nullable because every row written before this column existed has
     * nothing to put here truthfully; the migration backfills what it can
     * infer (a stored time limit could only ever mean exam) and leaves the
     * rest null, read as `study` — the default a null `mode` always meant.
     */
    mode: testMode("mode"),
    /**
     * The sections the student chose, snapshotted the same way `questionIds`
     * is. Empty means "the whole aircraft", matching `parseTopics` — this
     * exists only to describe a resumable session on the aircraft page and
     * the dashboard ("DA40 · Fuel System") without re-deriving it from the
     * questions themselves.
     */
    topics: text("topics").array().notNull().default(sql`'{}'::text[]`),
    /** Null means still in progress. Set once, at Finish, and never cleared. */
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    // The guard that makes a repeated submission a no-op rather than a duplicate,
    // and what a resume looks a session up by.
    uniqueIndex("test_sessions_user_client_test_unique").on(table.userId, table.clientTestId),
    // "Progress over time", newest first (Phase 4). Only ever reads finished
    // sessions, but the index does not need to know that.
    index("test_sessions_user_completed_idx").on(table.userId, table.completedAt),
    // The same, scoped to one aircraft.
    index("test_sessions_user_aircraft_completed_idx").on(
      table.userId,
      table.aircraftCode,
      table.completedAt,
    ),
    // The owner funnel's "users who finished a test in the last N days" —
    // scoped by date alone, with no user in the predicate, so the two
    // indexes above (both leading on userId) cannot serve it.
    index("test_sessions_completed_at_idx").on(table.completedAt),
  ],
);

/**
 * Every single answer a user has given. The foundation of all reporting.
 *
 * One row per `(testSessionId, questionId)` — enforced below — written the
 * moment the question is answered, not at the end of the test. That is what
 * lets a partly-finished test still count towards topic performance and the
 * overall score, and what a mid-test refresh resumes from.
 *
 * A row is mutable, but only for as long as its test session is in progress:
 * going back and changing an answer before Finish updates the same row rather
 * than adding a second one. Once the session's `completedAt` is set, the row
 * is frozen — nothing after that point may write to it again. That frozen
 * state is what earlier phases meant by "append-only", refined now that
 * recording no longer waits for the end of the test: a *finished* test's
 * history still never gets silently rewritten, only an active one can change,
 * and only because the student can too, by going back a question.
 *
 * `topic` and `aircraftCode` are stored here rather than read through a join,
 * and there is deliberately no foreign key to `questions`, for the same
 * reason: `npm run db:seed` deletes questions whose content files are gone. A
 * foreign key would either erase a pilot's history (cascade) or make the
 * deploy fail (restrict). Neither is acceptable: editing content must never
 * rewrite the past, and the past must never block an edit. Reports join to
 * `questions` when they need the current wording, and simply skip questions
 * that no longer exist.
 */
export const attempts = pgTable(
  "attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    testSessionId: uuid("test_session_id")
      .notNull()
      .references(() => testSessions.id, { onDelete: "cascade" }),
    /** Plain text by design, not a foreign key. See the note above. */
    questionId: varchar("question_id", { length: 40 }).notNull(),
    /** Not a foreign key to `aircraft.code` either — a class rating's code
     * lives here just as well, which is what lets its test flow reuse this
     * whole table, and everything read from it, unchanged. See the note on
     * `classRatings` above. */
    aircraftCode: varchar("aircraft_code", { length: 8 }).notNull(),
    /** Snapshot of the topic as it was when the question was answered. */
    topic: varchar("topic", { length: 60 }).notNull(),
    /** Null means the question was shown but left unanswered. */
    selectedOptionId: varchar("selected_option_id", { length: 4 }),
    isCorrect: boolean("is_correct").notNull(),
    answeredAt: timestamp("answered_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Exactly one row per question per test. What makes recording an answer
    // an upsert — going back and changing one before Finish replaces this
    // row rather than adding a second — and what a resume reads back from.
    uniqueIndex("attempts_session_question_unique").on(table.testSessionId, table.questionId),
    // "Performance broken down by topic" — the most important report.
    index("attempts_user_aircraft_topic_idx").on(
      table.userId,
      table.aircraftCode,
      table.topic,
    ),
    // "Questions answered incorrectly, with the ability to retry only those".
    index("attempts_user_correct_idx").on(table.userId, table.aircraftCode, table.isCorrect),
    // Every attempt at one question, for per-question history.
    index("attempts_user_question_idx").on(table.userId, table.questionId),
    // All the answers in one test.
    index("attempts_session_idx").on(table.testSessionId),
    // The owner insights "question quality" signal groups by question across
    // every user — the indexes above all lead on userId, which is the wrong
    // side of that query.
    index("attempts_question_id_idx").on(table.questionId),
  ],
);

export type TestSessionRow = typeof testSessions.$inferSelect;
export type TestSessionInsert = typeof testSessions.$inferInsert;
export type AttemptRow = typeof attempts.$inferSelect;
export type AttemptInsert = typeof attempts.$inferInsert;

/**
 * A question a student has marked to come back to.
 *
 * `questionId` is plain text, not a foreign key — the same reasoning as
 * `attempts.questionId`: `db:seed` deletes questions whose content files are
 * gone, and a foreign key would either erase a flag silently (cascade) or
 * block a legitimate content edit (restrict). A flag on a since-deleted
 * question simply never renders again, because nothing fetches it.
 *
 * `aircraftCode` is a snapshot for the same reason it is one on `attempts`:
 * "flagged questions on this aircraft" needs to be answerable with no join
 * back to `questions`, which is exactly the query the test builder's "My
 * flagged questions" preset runs.
 *
 * One row per `(userId, questionId)` — the unique index is what makes
 * toggling a flag an insert-or-delete rather than something that could ever
 * double up.
 */
export const questionFlags = pgTable(
  "question_flags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: varchar("question_id", { length: 40 }).notNull(),
    aircraftCode: varchar("aircraft_code", { length: 8 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("question_flags_user_question_unique").on(table.userId, table.questionId),
    // "My flagged questions" on this aircraft, for the test builder preset.
    index("question_flags_user_aircraft_idx").on(table.userId, table.aircraftCode),
    // The owner insights "most-flagged questions" list groups by question
    // across every user.
    index("question_flags_question_id_idx").on(table.questionId),
  ],
);

export type QuestionFlagRow = typeof questionFlags.$inferSelect;
export type QuestionFlagInsert = typeof questionFlags.$inferInsert;

/**
 * A student's own note on one question, shown alongside it and on the
 * results review. Exactly one per `(userId, questionId)` — writing a second
 * note for the same question replaces the first, which is what "autosaves"
 * means here: there is nothing to version, only a body to keep current.
 *
 * Same no-foreign-key, snapshotted-`aircraftCode` reasoning as
 * `questionFlags` above, for the same reason.
 */
export const questionNotes = pgTable(
  "question_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: varchar("question_id", { length: 40 }).notNull(),
    aircraftCode: varchar("aircraft_code", { length: 8 }).notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("question_notes_user_question_unique").on(table.userId, table.questionId),
  ],
);

export type QuestionNoteRow = typeof questionNotes.$inferSelect;
export type QuestionNoteInsert = typeof questionNotes.$inferInsert;

/**
 * Failed log in attempts, for rate limiting.
 *
 * Only failures are recorded — a successful log in clears the user's row, so
 * the table stays small and a person who simply mistyped once is not punished
 * later.
 *
 * The counters live in the database rather than in memory on purpose. On
 * Vercel the app runs as short-lived instances that do not share memory, so an
 * in-memory counter would reset constantly and an attacker would walk straight
 * past it.
 */
export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /**
     * What is being counted: `ip:1.2.3.4` or `email:someone@example.com`.
     * Emails are counted whether or not an account exists for them — counting
     * only real accounts would make the difference in behaviour a way to
     * discover which addresses are registered.
     */
    key: varchar("key", { length: 300 }).notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // The only query this table serves: recent failures for one key.
    index("login_attempts_key_time_idx").on(table.key, table.attemptedAt),
    // Sweeping rows that have aged out of every window.
    index("login_attempts_time_idx").on(table.attemptedAt),
  ],
);

export type LoginAttemptRow = typeof loginAttempts.$inferSelect;

/**
 * Paid access. Recurring subscription, not a one-off purchase — `status` and
 * `currentPeriodEnd` are what a webhook from the payment provider keeps
 * current, not what a purchase event sets once and forgets.
 *
 * One row per user, upserted in place on every provider webhook, rather than
 * one row per payment: a report on "is this user paying right now" only ever
 * needs the latest state, and a history of past payments is the provider's
 * job, not this database's.
 *
 * Not a foreign key to anything content-shaped, and there is nothing here
 * that content deletion could ever invalidate — unlike `attempts`, this table
 * has no reason to survive independently of the user it belongs to, so it
 * cascades on account deletion like `sessions` does.
 */
export const subscriptionPlan = pgEnum("subscription_plan", ["monthly", "quarterly"]);
export const subscriptionStatus = pgEnum("subscription_status", [
  "active",
  "canceled",
  "expired",
]);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    plan: subscriptionPlan("plan").notNull(),
    status: subscriptionStatus("status").notNull(),
    /** Always "stripe" today. Kept as a column, not assumed, in case a
     * second provider is ever added — the same reasoning as `sendEmail`
     * having one interface behind it. Application code always sets this
     * explicitly (see `upsertSubscription`); the default here is only ever
     * a fallback, never relied upon. */
    provider: varchar("provider", { length: 32 }).notNull().default("stripe"),
    /**
     * Stripe's own id for the subscription object — what a renewal or
     * cancellation event is looked up by if its metadata is ever missing.
     */
    providerSubscriptionRef: varchar("provider_subscription_ref", { length: 64 }),
    /**
     * When the current paid period ends. `null` briefly between checkout and
     * the first webhook event confirming it — never treated as "unlimited",
     * only as "not confirmed yet"; see `hasActiveSubscription`.
     */
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // One row per user — a webhook updates it in place rather than adding a
    // second row for a renewal or a plan change.
    uniqueIndex("subscriptions_user_id_unique").on(table.userId),
    // Renewal and cancellation webhook events arrive keyed by the
    // provider's own reference, not by our user id.
    index("subscriptions_provider_ref_idx").on(table.providerSubscriptionRef),
    // The owner insights dashboard's "active" and "expiring soon" counts
    // filter on both columns together with no user in the predicate, which
    // the unique index above (leading on userId) cannot serve.
    index("subscriptions_status_period_end_idx").on(table.status, table.currentPeriodEnd),
  ],
);

export type SubscriptionRow = typeof subscriptions.$inferSelect;
export type SubscriptionInsert = typeof subscriptions.$inferInsert;

/**
 * A code that grants full access without touching Stripe —
 * `upsertSubscription`'s `provider` column exists precisely so a second
 * source of access could be added without changing that function, and this
 * is that second source.
 *
 * `code` is stored normalised (uppercase, no separators) so a lookup never
 * depends on how the redeemer typed the dashes back in — `normalizeGiftCode`
 * in `gift-codes.ts` is the one place both sides agree on that shape.
 *
 * Originally single-use, gated by `redeemedByUserId is null`. It is now a
 * general-purpose license key that may be redeemed by more than one person
 * (`maxRedemptions`), so the count of who has redeemed it lives in the child
 * table below rather than as a single nullable pair of columns — the same
 * reason `subscriptions` is one row per user rather than one per payment,
 * just inverted: here it is one code with many redeemers, not one user with
 * many payments.
 *
 * `redeemedByUserId`/`redeemedAt` stay, but now mean only "who redeemed this
 * *first*" — kept for the existing single-use display path and as a cheap
 * "has this code ever been used" flag. They are no longer what gates a
 * redemption; `gift_code_redemptions` is, via a count against
 * `maxRedemptions`. A code with `maxRedemptions` of 1 behaves exactly as
 * before.
 *
 * `disabledAt` lets an owner stop a code being redeemed further without
 * deleting it — deleting would erase `gift_code_redemptions`' own history
 * through the cascade, and "what did this code do before it was disabled"
 * is exactly the question disabling it is usually asked to answer.
 *
 * `expiresAt` is optional and, unlike a Stripe subscription's period, is
 * about the *code* going stale before anyone uses it — nothing about a
 * redemption already made is affected by it.
 *
 * `unlocksAircraftCode` is stored and shown but **not enforced by
 * redemption today** — `subscriptions` is one global row per user with no
 * aircraft scoping, and making a code aircraft-specific would mean changing
 * the access model everywhere it is checked (`answerQuestion`, the test
 * size cap, `/upgrade`, every owner access screen). Redeeming a code with
 * this set still grants full access, the same as one without it; the field
 * exists so the owner can record and communicate intent for a future
 * aircraft-scoped access model without that model existing yet.
 *
 * `plan` and `durationDays` describe what the code is worth, not what it
 * bills — there is no charge here, so nothing about a code ever expires on
 * its own the way a Stripe subscription's period does; it simply waits until
 * someone redeems it.
 */
export const giftCodes = pgTable(
  "gift_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 24 }).notNull(),
    plan: subscriptionPlan("plan").notNull(),
    /** Days of full access this code grants once redeemed. */
    durationDays: integer("duration_days").notNull(),
    /** For the owner's own records — e.g. "beta testers, Sept 2026" — never
     * shown to the redeemer. */
    note: varchar("note", { length: 200 }),
    /** Who redeemed this code first, and when. See the note above: no longer
     * what gates a redemption once `maxRedemptions` exceeds 1. */
    redeemedByUserId: uuid("redeemed_by_user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
    /** How many people may redeem this code in total. 1 is the original,
     * single-use behaviour. */
    maxRedemptions: integer("max_redemptions").notNull().default(1),
    /** Null means the code never goes stale on its own. */
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    /** Set to stop further redemptions without deleting the code or its
     * redemption history. Null means the code is live. */
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    /** Which aircraft this code is meant for, or null for "all aircraft".
     * Recorded, not enforced — see the note above. */
    unlocksAircraftCode: varchar("unlocks_aircraft_code", { length: 8 }),
    /**
     * What redeeming this code grants: `subscription` — days of full
     * access, everything above — or `logbook`, one Logbook Scanner unlock
     * (a row in `logbook_credits`). A logbook code ignores `plan` and
     * `durationDays`, which it carries only because both columns predate it
     * and are not null; it is minted with `durationDays` 0.
     */
    grants: varchar("grants", { length: 16 }).notNull().default("subscription"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("gift_codes_code_unique").on(table.code)],
);

export type GiftCodeRow = typeof giftCodes.$inferSelect;
export type GiftCodeInsert = typeof giftCodes.$inferInsert;

/**
 * One redemption of a gift code. What actually gates a code against its
 * `maxRedemptions` — a `count(*)` here compared to that column, inside the
 * same transaction that inserts the next row, the same "read inside the
 * transaction that writes" shape `redeemGiftCode` already used when the
 * gate was `redeemed_by_user_id is null` on the parent row.
 *
 * `unique(codeId, userId)` stops the same person redeeming the same code
 * twice — a second submission of the same code by the same account is a
 * double-click or a resubmitted form, not a second, distinct redemption,
 * and must not count twice against `maxRedemptions`.
 */
export const giftCodeRedemptions = pgTable(
  "gift_code_redemptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    giftCodeId: uuid("gift_code_id")
      .notNull()
      .references(() => giftCodes.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("gift_code_redemptions_code_user_unique").on(table.giftCodeId, table.userId),
    // "Every redemption of this code, newest first" — the per-code list the
    // owner screen shows.
    index("gift_code_redemptions_code_idx").on(table.giftCodeId, table.redeemedAt),
    // The signup funnel's "did this user redeem a code" check — the unique
    // index above leads with giftCodeId, the wrong side for "by user".
    index("gift_code_redemptions_user_idx").on(table.userId),
    // The insights dashboard's "codes redeemed this month" count, filtered
    // on the date alone with no code or user in the predicate.
    index("gift_code_redemptions_redeemed_at_idx").on(table.redeemedAt),
  ],
);

export type GiftCodeRedemptionRow = typeof giftCodeRedemptions.$inferSelect;

/**
 * "Which aircraft next?" — the landing page's email capture for anyone whose
 * type is not in the bank yet.
 *
 * Not a foreign key to anything, and not deduplicated: unlike `users.email`,
 * two submissions from the same address (perhaps naming two different
 * aircraft) are both worth keeping, and this table has no login or lookup of
 * its own to protect — it is read by the owner, not by the application.
 */
export const aircraftInterest = pgTable(
  "aircraft_interest",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 254 }).notNull(),
    /** Free text as submitted, e.g. "A320" or "Cessna 172" — there is no
     * fixed list of aircraft to choose from. */
    aircraft: varchar("aircraft", { length: 120 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("aircraft_interest_created_at_idx").on(table.createdAt)],
);

export type AircraftInterestRow = typeof aircraftInterest.$inferSelect;
export type AircraftInterestInsert = typeof aircraftInterest.$inferInsert;

/**
 * Settings the owner can change from the website, without a deploy.
 *
 * A key/value table rather than one row with a column per setting: adding a
 * setting is then an insert rather than a migration, and a setting that was
 * removed leaves a row nobody reads rather than a column nobody drops.
 *
 * Deliberately **not** where content lives. `db:seed` rewrites `aircraft`
 * and `questions` from `/content` on every deploy, so anything stored here
 * that content also owns would be two sources of truth with the files
 * winning silently. What belongs here is what no file describes: the size
 * of the free allowance, and a line of text to show everyone.
 *
 * Every value is text. The shape each key is supposed to have is enforced
 * in `src/lib/settings.ts`, where it can be unit tested without a database,
 * the same split as `schema.ts` and `src/content/schema.ts`.
 */
export const siteSettings = pgTable("site_settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SiteSettingRow = typeof siteSettings.$inferSelect;

/**
 * A signed-in student's answer was refused because the free allowance for
 * that aircraft was spent and there is no active subscription —
 * `answerQuestion`'s `"paywall"` status, the one branch that previously
 * wrote nothing at all.
 *
 * Exists purely to make "users who hit a paywall gate" answerable for the
 * owner insights funnel; nothing reads it to decide whether to grade or
 * record anything, and nothing about the paywall's own behaviour changes.
 * Not scoped further than aircraft and user — this is a funnel signal, not
 * a per-question record, so there is deliberately no `questionId`.
 */
export const paywallHits = pgTable(
  "paywall_hits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    aircraftCode: varchar("aircraft_code", { length: 8 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // "Distinct users who hit the paywall in the last N days" for the funnel.
    index("paywall_hits_created_at_idx").on(table.createdAt),
    index("paywall_hits_user_idx").on(table.userId),
  ],
);

export type PaywallHitRow = typeof paywallHits.$inferSelect;

/**
 * The owner's private note on one account — "asked for a refund, gave them
 * a month", that kind of thing. Never shown to the account it is about.
 *
 * Its own table rather than a column on `users`, for the same reason
 * `db/owner.ts` is its own module: `users` is the auth system's table, read
 * and written from ordinary sign-in and sign-up paths that have no business
 * knowing an owner's notes exist. One row per user, upserted in place —
 * there is one note per account, not a history of notes, the same shape as
 * `question_notes`.
 */
export const accountNotes = pgTable("account_notes", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AccountNoteRow = typeof accountNotes.$inferSelect;

/**
 * "Report a problem" on a question, from the test-taking UI.
 *
 * Deliberately outside `questions` and carrying no foreign key to it, for
 * the same reason `attempts.questionId` does not: `db:seed` deletes
 * questions whose content files are gone, and a foreign key would either
 * silently erase a report (cascade) or block a legitimate content edit
 * (restrict). A report on a since-deleted or since-corrected question
 * simply stops resolving to a question the inbox can show inline — it is
 * not deleted, so it still counts in whatever history the owner keeps.
 *
 * `userId` is nullable because a signed-out visitor can report a problem
 * too — practising without an account still means reading a question that
 * might be wrong, and there is nothing about grading here to gate on being
 * signed in the way flags and notes are.
 *
 * This table is written to and read from; it is never itself the answer key
 * or a place fixes happen. Fixing a question is still the content-file
 * workflow this phase does not touch — the inbox at `/owner/reports` is
 * read-only against `questions` and writes only `status` here.
 */
export const reportReason = pgEnum("report_reason", [
  "wrong_answer",
  "unclear",
  "typo",
  "outdated",
  "other",
]);
export const reportStatus = pgEnum("report_status", ["open", "resolved", "dismissed"]);

export const questionReports = pgTable(
  "question_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Plain text, not a foreign key. See the note above. */
    questionId: varchar("question_id", { length: 40 }).notNull(),
    /** Null for a signed-out reporter. */
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    reason: reportReason("reason").notNull(),
    comment: varchar("comment", { length: 1000 }),
    status: reportStatus("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // The inbox's default view: open reports, newest first.
    index("question_reports_status_created_idx").on(table.status, table.createdAt),
    // Every report on one question, for showing them grouped.
    index("question_reports_question_id_idx").on(table.questionId),
  ],
);

export type QuestionReportRow = typeof questionReports.$inferSelect;
export type QuestionReportInsert = typeof questionReports.$inferInsert;

/**
 * Every mutating action taken under `/owner`, written automatically by the
 * one wrapper (`ownerAction` in `src/lib/owner/audited-action.ts`) every such
 * action is built from — not something each handler remembers to call for
 * itself, which is the version of this that silently goes missing on the
 * next action added.
 *
 * `actorEmail` rather than a foreign key to `users`: the owner is identified
 * by email throughout this codebase (`isOwner`, `OWNER_EMAIL`), there is no
 * role table to join to, and a log entry should still name who did
 * something even if that account were ever deleted.
 *
 * `targetId` is a free-form string (a user id, a gift code, a report id) and
 * nullable for an action with no single target (e.g. a settings change).
 * `metadata` carries whatever the action itself thinks is worth keeping —
 * the days granted, the plan chosen, the setting's old and new value — kept
 * as `jsonb` rather than a fixed set of columns because every action shapes
 * this differently and a log is exactly the kind of table where "what does
 * this row mean" should not require a migration to extend.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorEmail: varchar("actor_email", { length: 254 }).notNull(),
    action: varchar("action", { length: 64 }).notNull(),
    targetType: varchar("target_type", { length: 32 }).notNull(),
    targetId: varchar("target_id", { length: 64 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // The log view's default order.
    index("audit_log_created_at_idx").on(table.createdAt),
    // Filtering by action type, newest first.
    index("audit_log_action_created_idx").on(table.action, table.createdAt),
  ],
);

export type AuditLogRow = typeof auditLog.$inferSelect;

/**
 * What a signed-out visitor has already been shown the answer to.
 *
 * This table exists because the free allowance above cannot: it is counted
 * from `attempts`, and `attempts` needs a `userId`. Before it, a signed-out
 * visitor was metered by nothing at all — the test page would build a test
 * of any size for them, and `answerQuestion` would hand back the correct
 * option and the explanation for any published question, indefinitely. The
 * whole bank, answers included, was therefore reachable by a script with no
 * account. This is what closes that.
 *
 * `visitorId` is the SHA-256 of a random token held in an HTTP-only cookie,
 * never the token itself — the same design as `sessions`, and for the same
 * reason: reading this table tells you that somebody previewed some
 * questions and gives you nothing you could use.
 *
 * One row per `(visitorId, questionId)`, so answering the same question
 * twice costs nothing further — exactly the rule `hasAnsweredQuestionBefore`
 * already applies to a signed-in student's allowance.
 *
 * No foreign key to `questions`, for the same reason `attempts` has none:
 * `db:seed` deletes questions whose content files are gone, and that must
 * neither erase this nor fail the deploy.
 *
 * Be honest about what this does and does not do. A cookie can be cleared,
 * and a client that never sends one back is a new visitor on every request.
 * The metering is therefore a product rule, and the thing that actually
 * bounds a scripted scrape is the per-address rate limit beside it
 * (`RATE_LIMIT_RULES.previewPerIp`). Both are needed: the limit alone would
 * let one patient visitor read everything, and this alone would stop nobody
 * willing to drop a cookie.
 */
export const previewAttempts = pgTable(
  "preview_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** SHA-256 hex of the visitor cookie's token. Never the token. */
    visitorId: varchar("visitor_id", { length: 64 }).notNull(),
    questionId: varchar("question_id", { length: 40 }).notNull(),
    aircraftCode: varchar("aircraft_code", { length: 8 }).notNull(),
    answeredAt: timestamp("answered_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // "Has this visitor already been shown this one?" — and what makes a
    // repeat answer free rather than a second row.
    uniqueIndex("preview_attempts_visitor_question_unique").on(table.visitorId, table.questionId),
    // "How many has this visitor spent on this aircraft?", the count the
    // preview allowance is decided against. Per aircraft, like the free
    // tier, so trying a second type does not spend the first one's preview.
    index("preview_attempts_visitor_aircraft_idx").on(table.visitorId, table.aircraftCode),
    // For the housekeeping sweep; nothing reads by date otherwise.
    index("preview_attempts_answered_at_idx").on(table.answeredAt),
  ],
);

export type PreviewAttemptRow = typeof previewAttempts.$inferSelect;

/**
 * A message the owner sends to many students at once.
 *
 * `body` is plain text, kept as written; the HTML version is made from it at
 * send time (`composeBroadcastEmail`), so what is stored is exactly what the
 * owner typed. `audience` and `onlyConfirmed` record who it was aimed at
 * *when it was sent* — the recipient list itself is `broadcast_deliveries`,
 * fixed at that moment, so a later change to who is subscribed never alters
 * the history of who was written to.
 */
export const broadcasts = pgTable(
  "broadcasts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subject: varchar("subject", { length: 150 }).notNull(),
    body: text("body").notNull(),
    audience: varchar("audience", { length: 24 }).notNull(),
    onlyConfirmed: boolean("only_confirmed").notNull().default(true),
    createdByEmail: varchar("created_by_email", { length: 254 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("broadcasts_created_at_idx").on(table.createdAt)],
);

/**
 * One recipient of one broadcast, and what became of the email.
 *
 * Doubles as the queue: rows start `queued`, a sender claims a few at a time
 * (`sending`) and ends each as `sent` or `failed`. A browser tab closing
 * halfway leaves a half-sent broadcast that can simply be continued; nothing
 * is held in memory. `email` is a snapshot of the address written to. The
 * rows go with the account if it is deleted (cascade), which is the right
 * trade for personal data.
 *
 * `unsubscribeTokenHash` is the SHA-256 of the random token in this one
 * email's unsubscribe link — set at the moment of sending, never the raw
 * token, for the reason session cookies and reset links are stored that way.
 */
export const broadcastDeliveries = pgTable(
  "broadcast_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    broadcastId: uuid("broadcast_id")
      .notNull()
      .references(() => broadcasts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 254 }).notNull(),
    status: varchar("status", { length: 12 }).notNull().default("queued"),
    error: varchar("error", { length: 200 }),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    unsubscribeTokenHash: varchar("unsubscribe_token_hash", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // A student is written to once per broadcast, whatever races.
    uniqueIndex("broadcast_deliveries_broadcast_user_unique").on(table.broadcastId, table.userId),
    // Claiming the next queued rows, and counting by status.
    index("broadcast_deliveries_broadcast_status_idx").on(table.broadcastId, table.status),
    // Finding the delivery an unsubscribe link belongs to.
    index("broadcast_deliveries_unsubscribe_hash_idx").on(table.unsubscribeTokenHash),
  ],
);

export type BroadcastRow = typeof broadcasts.$inferSelect;
export type BroadcastDeliveryRow = typeof broadcastDeliveries.$inferSelect;

/**
 * Logbook Scanner: one paper logbook being converted.
 *
 * The row exists from the first upload, because what a student has paid for
 * (`unlockedAt`) belongs to one logbook and has to be findable again. The
 * logbook's *content* — `data`, the extracted and reviewed pages — is null
 * until the student presses "Save to my account": photos are never stored at
 * all, and extracted entries only on request. "Delete all my logbook data"
 * deletes these rows outright.
 */
export const logbooks = pgTable(
  "logbooks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull().default("My logbook"),
    /** Set once a credit has been spent on this logbook. */
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }),
    /** Where the unlock came from: gift, manual, subscription or purchase. */
    unlockSource: varchar("unlock_source", { length: 16 }),
    /** The saved review state, only when the student chose to save it. */
    data: jsonb("data"),
    savedAt: timestamp("saved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("logbooks_user_idx").on(table.userId, table.updatedAt)],
);

export type LogbookRowRecord = typeof logbooks.$inferSelect;

/**
 * One extraction request: the meter for the free allowance and an unlock's
 * spread limit, and the owner's token and cost log.
 *
 * Holds no logbook content — no image, no entries — so it outlives "Delete
 * all my logbook data" deliberately: the free allowance is "the first two
 * spreads per account", and deleting would otherwise reset it. `logbookId`
 * is therefore not a foreign key. A `pending` row is a reservation made
 * before the model is called, so two uploads racing cannot both take the
 * last free spread; a stale one stops counting after ten minutes.
 */
export const logbookExtractions = pgTable(
  "logbook_extractions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    logbookId: uuid("logbook_id"),
    /** `free` or `unlock` — which allowance this spread was counted against. */
    chargedTo: varchar("charged_to", { length: 8 }).notNull(),
    /** `pending`, `ok` or `failed`. Only `ok` (and fresh `pending`) count. */
    status: varchar("status", { length: 8 }).notNull().default("pending"),
    model: varchar("model", { length: 64 }).notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    cacheReadTokens: integer("cache_read_tokens").notNull().default(0),
    cacheWriteTokens: integer("cache_write_tokens").notNull().default(0),
    /** Millionths of a US dollar; null for a model with no known price. */
    costMicroUsd: integer("cost_micro_usd"),
    attempts: smallint("attempts").notNull().default(0),
    durationMs: integer("duration_ms"),
    error: varchar("error", { length: 200 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("logbook_extractions_user_idx").on(table.userId, table.chargedTo, table.status),
    index("logbook_extractions_logbook_idx").on(table.logbookId),
    index("logbook_extractions_created_at_idx").on(table.createdAt),
  ],
);

/**
 * One logbook unlock a student holds, spent or not. Granted by a gift code
 * (`grants = 'logbook'`), by the owner by hand, or — when a provider is
 * connected — by a purchase. A subscriber's one included conversion is a
 * row too, written at the moment it is spent; the partial unique index is
 * what stops it being taken twice.
 */
export const logbookCredits = pgTable(
  "logbook_credits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    source: varchar("source", { length: 16 }).notNull(),
    giftCodeId: uuid("gift_code_id").references(() => giftCodes.id, { onDelete: "set null" }),
    note: varchar("note", { length: 200 }),
    usedAt: timestamp("used_at", { withTimezone: true }),
    usedForLogbookId: uuid("used_for_logbook_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("logbook_credits_user_idx").on(table.userId, table.usedAt),
    uniqueIndex("logbook_credits_one_subscription_unique")
      .on(table.userId)
      .where(sql`${table.source} = 'subscription'`),
  ],
);
