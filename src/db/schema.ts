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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // One account per address. The database enforces this, not just the form:
    // two simultaneous sign-ups for the same email must not both succeed.
    uniqueIndex("users_email_unique").on(table.email),
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
  ],
);

export type TestSessionRow = typeof testSessions.$inferSelect;
export type TestSessionInsert = typeof testSessions.$inferInsert;
export type AttemptRow = typeof attempts.$inferSelect;
export type AttemptInsert = typeof attempts.$inferInsert;

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
  ],
);

export type SubscriptionRow = typeof subscriptions.$inferSelect;
export type SubscriptionInsert = typeof subscriptions.$inferInsert;

/**
 * A free, single-use code that grants full access without touching Stripe —
 * `upsertSubscription`'s `provider` column exists precisely so a second
 * source of access could be added without changing that function, and this
 * is that second source.
 *
 * `code` is stored normalised (uppercase, no separators) so a lookup never
 * depends on how the redeemer typed the dashes back in — `normalizeGiftCode`
 * in `gift-codes.ts` is the one place both sides agree on that shape.
 * `redeemedByUserId`/`redeemedAt` are null until spent, the same
 * unredeemed-until-claimed shape as `passwordResetTokens.usedAt`: a code is
 * claimed by an update whose own `where` requires `redeemed_by_user_id is
 * null`, so two redemption attempts racing on the same code cannot both win.
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
    redeemedByUserId: uuid("redeemed_by_user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("gift_codes_code_unique").on(table.code)],
);

export type GiftCodeRow = typeof giftCodes.$inferSelect;

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
