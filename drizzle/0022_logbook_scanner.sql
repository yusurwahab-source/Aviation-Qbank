CREATE TABLE "logbook_credits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source" varchar(16) NOT NULL,
	"gift_code_id" uuid,
	"note" varchar(200),
	"used_at" timestamp with time zone,
	"used_for_logbook_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "logbook_extractions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"logbook_id" uuid,
	"charged_to" varchar(8) NOT NULL,
	"status" varchar(8) DEFAULT 'pending' NOT NULL,
	"model" varchar(64) NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cache_read_tokens" integer DEFAULT 0 NOT NULL,
	"cache_write_tokens" integer DEFAULT 0 NOT NULL,
	"cost_micro_usd" integer,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"duration_ms" integer,
	"error" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "logbooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(120) DEFAULT 'My logbook' NOT NULL,
	"unlocked_at" timestamp with time zone,
	"unlock_source" varchar(16),
	"data" jsonb,
	"saved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gift_codes" ADD COLUMN "grants" varchar(16) DEFAULT 'subscription' NOT NULL;--> statement-breakpoint
ALTER TABLE "logbook_credits" ADD CONSTRAINT "logbook_credits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logbook_credits" ADD CONSTRAINT "logbook_credits_gift_code_id_gift_codes_id_fk" FOREIGN KEY ("gift_code_id") REFERENCES "public"."gift_codes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logbook_extractions" ADD CONSTRAINT "logbook_extractions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logbooks" ADD CONSTRAINT "logbooks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "logbook_credits_user_idx" ON "logbook_credits" USING btree ("user_id","used_at");--> statement-breakpoint
CREATE UNIQUE INDEX "logbook_credits_one_subscription_unique" ON "logbook_credits" USING btree ("user_id") WHERE "logbook_credits"."source" = 'subscription';--> statement-breakpoint
CREATE INDEX "logbook_extractions_user_idx" ON "logbook_extractions" USING btree ("user_id","charged_to","status");--> statement-breakpoint
CREATE INDEX "logbook_extractions_logbook_idx" ON "logbook_extractions" USING btree ("logbook_id");--> statement-breakpoint
CREATE INDEX "logbook_extractions_created_at_idx" ON "logbook_extractions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "logbooks_user_idx" ON "logbooks" USING btree ("user_id","updated_at");