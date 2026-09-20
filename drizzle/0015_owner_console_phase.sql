-- This migration is written defensively (IF NOT EXISTS / DROP+CREATE / DO
-- $$ guards) rather than as drizzle-kit's plain generated output. An
-- earlier deploy attempt reached this file, got partway through applying
-- it against the real database, and failed on a later, unrelated step in
-- the same `vercel-build` chain — leaving some of these objects already
-- created but the migration never recorded as applied, so the next
-- attempt reran the whole file from the top and collided with what it had
-- already created ("relation \"question_reports\" already exists").
-- Every statement below is safe to run whether or not its object already
-- exists, so this migration now converges on the same end state
-- regardless of how far a previous attempt got.
DO $$ BEGIN
  CREATE TYPE "public"."report_reason" AS ENUM('wrong_answer', 'unclear', 'typo', 'outdated', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."report_status" AS ENUM('open', 'resolved', 'dismissed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
-- These five tables are all brand new in this migration — nothing already
-- deployed reads or writes any of them — so dropping and recreating any
-- stray copy left by a previous partial attempt is lossless, and safer
-- than trusting a same-named object to already have exactly this shape.
DROP TABLE IF EXISTS "account_notes" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "audit_log" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "gift_code_redemptions" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "paywall_hits" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "question_reports" CASCADE;--> statement-breakpoint
CREATE TABLE "account_notes" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"body" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_email" varchar(254) NOT NULL,
	"action" varchar(64) NOT NULL,
	"target_type" varchar(32) NOT NULL,
	"target_id" varchar(64),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gift_code_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gift_code_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"redeemed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paywall_hits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"aircraft_code" varchar(8) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" varchar(40) NOT NULL,
	"user_id" uuid,
	"reason" "report_reason" NOT NULL,
	"comment" varchar(1000),
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- gift_codes is a real, existing table with real data — never dropped.
-- IF NOT EXISTS on each column add is what makes this safe to rerun.
ALTER TABLE "gift_codes" ADD COLUMN IF NOT EXISTS "max_redemptions" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "gift_codes" ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "gift_codes" ADD COLUMN IF NOT EXISTS "disabled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "gift_codes" ADD COLUMN IF NOT EXISTS "unlocks_aircraft_code" varchar(8);--> statement-breakpoint
-- Every constraint below is on one of the five freshly (re)created tables
-- above, so it is guaranteed not to exist yet at this point in the file.
ALTER TABLE "account_notes" ADD CONSTRAINT "account_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_code_redemptions" ADD CONSTRAINT "gift_code_redemptions_gift_code_id_gift_codes_id_fk" FOREIGN KEY ("gift_code_id") REFERENCES "public"."gift_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_code_redemptions" ADD CONSTRAINT "gift_code_redemptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paywall_hits" ADD CONSTRAINT "paywall_hits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_reports" ADD CONSTRAINT "question_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_action_created_idx" ON "audit_log" USING btree ("action","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "gift_code_redemptions_code_user_unique" ON "gift_code_redemptions" USING btree ("gift_code_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gift_code_redemptions_code_idx" ON "gift_code_redemptions" USING btree ("gift_code_id","redeemed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "paywall_hits_created_at_idx" ON "paywall_hits" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "paywall_hits_user_idx" ON "paywall_hits" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "question_reports_status_created_idx" ON "question_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "question_reports_question_id_idx" ON "question_reports" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attempts_question_id_idx" ON "attempts" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "question_flags_question_id_idx" ON "question_flags" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_sessions_completed_at_idx" ON "test_sessions" USING btree ("completed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
-- Backfill: every code already redeemed under the old single-use mechanism
-- (`redeemed_by_user_id` set directly on the code) gets its one redemption
-- reflected in the new child table too. Without this, `maxRedemptions`
-- defaults to 1 but `gift_code_redemptions` would show 0 rows for an
-- already-spent code, and the new count-based gate would let a second,
-- different person redeem a code that was meant to be spent. Safe to
-- rerun on its own merits too (`ON CONFLICT DO NOTHING`), on top of the
-- child table above always being freshly emptied by the DROP+CREATE.
INSERT INTO "gift_code_redemptions" ("gift_code_id", "user_id", "redeemed_at")
SELECT "id", "redeemed_by_user_id", COALESCE("redeemed_at", now())
FROM "gift_codes"
WHERE "redeemed_by_user_id" IS NOT NULL
ON CONFLICT DO NOTHING;
