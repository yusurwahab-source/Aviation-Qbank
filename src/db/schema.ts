import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
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
    difficulty: smallint("difficulty").notNull(),
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
    // Difficulty filters (Phase 5).
    index("questions_aircraft_status_difficulty_idx").on(
      table.aircraftCode,
      table.status,
      table.difficulty,
    ),
    check("questions_difficulty_range", sql`${table.difficulty} between 1 and 3`),
  ],
);

export type AircraftRow = typeof aircraft.$inferSelect;
export type AircraftInsert = typeof aircraft.$inferInsert;
export type QuestionRow = typeof questions.$inferSelect;
export type QuestionInsert = typeof questions.$inferInsert;
