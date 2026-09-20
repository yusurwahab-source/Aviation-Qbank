CREATE TYPE "public"."report_reason" AS ENUM('wrong_answer', 'unclear', 'typo', 'outdated', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'resolved', 'dismissed');--> statement-breakpoint
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
ALTER TABLE "gift_codes" ADD COLUMN "max_redemptions" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "gift_codes" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "gift_codes" ADD COLUMN "disabled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "gift_codes" ADD COLUMN "unlocks_aircraft_code" varchar(8);--> statement-breakpoint
ALTER TABLE "account_notes" ADD CONSTRAINT "account_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_code_redemptions" ADD CONSTRAINT "gift_code_redemptions_gift_code_id_gift_codes_id_fk" FOREIGN KEY ("gift_code_id") REFERENCES "public"."gift_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_code_redemptions" ADD CONSTRAINT "gift_code_redemptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paywall_hits" ADD CONSTRAINT "paywall_hits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_reports" ADD CONSTRAINT "question_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_log_action_created_idx" ON "audit_log" USING btree ("action","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "gift_code_redemptions_code_user_unique" ON "gift_code_redemptions" USING btree ("gift_code_id","user_id");--> statement-breakpoint
CREATE INDEX "gift_code_redemptions_code_idx" ON "gift_code_redemptions" USING btree ("gift_code_id","redeemed_at");--> statement-breakpoint
CREATE INDEX "paywall_hits_created_at_idx" ON "paywall_hits" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "paywall_hits_user_idx" ON "paywall_hits" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "question_reports_status_created_idx" ON "question_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "question_reports_question_id_idx" ON "question_reports" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "attempts_question_id_idx" ON "attempts" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "question_flags_question_id_idx" ON "question_flags" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "test_sessions_completed_at_idx" ON "test_sessions" USING btree ("completed_at");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
-- Backfill: every code already redeemed under the old single-use mechanism
-- (`redeemed_by_user_id` set directly on the code) gets its one redemption
-- reflected in the new child table too. Without this, `maxRedemptions`
-- defaults to 1 but `gift_code_redemptions` would show 0 rows for an
-- already-spent code, and the new count-based gate would let a second,
-- different person redeem a code that was meant to be spent.
INSERT INTO "gift_code_redemptions" ("gift_code_id", "user_id", "redeemed_at")
SELECT "id", "redeemed_by_user_id", COALESCE("redeemed_at", now())
FROM "gift_codes"
WHERE "redeemed_by_user_id" IS NOT NULL
ON CONFLICT DO NOTHING;