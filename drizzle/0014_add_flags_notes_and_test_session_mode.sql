CREATE TYPE "public"."test_mode" AS ENUM('study', 'exam');--> statement-breakpoint
CREATE TABLE "question_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"question_id" varchar(40) NOT NULL,
	"aircraft_code" varchar(8) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"question_id" varchar(40) NOT NULL,
	"aircraft_code" varchar(8) NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "test_sessions" ADD COLUMN "mode" "test_mode";--> statement-breakpoint
ALTER TABLE "test_sessions" ADD COLUMN "topics" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
-- Backfill for every row written before `mode` existed. This is not a guess:
-- `time_limit_seconds` was, until now, set if and only if the session was
-- exam mode (see `timeLimitFor` in src/lib/test-options.ts — null for study,
-- always non-null for exam). A row this leaves null is read as `study` by
-- the application, which is exactly what a null `mode` always meant.
UPDATE "test_sessions" SET "mode" = CASE WHEN "time_limit_seconds" IS NOT NULL THEN 'exam'::"public"."test_mode" ELSE 'study'::"public"."test_mode" END WHERE "mode" IS NULL;--> statement-breakpoint
ALTER TABLE "question_flags" ADD CONSTRAINT "question_flags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_notes" ADD CONSTRAINT "question_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "question_flags_user_question_unique" ON "question_flags" USING btree ("user_id","question_id");--> statement-breakpoint
CREATE INDEX "question_flags_user_aircraft_idx" ON "question_flags" USING btree ("user_id","aircraft_code");--> statement-breakpoint
CREATE UNIQUE INDEX "question_notes_user_question_unique" ON "question_notes" USING btree ("user_id","question_id");