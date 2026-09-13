ALTER TABLE "test_sessions" ADD COLUMN "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "test_sessions" ADD COLUMN "time_limit_seconds" integer;