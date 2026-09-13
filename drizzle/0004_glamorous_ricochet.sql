ALTER TABLE "test_sessions" ALTER COLUMN "completed_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "test_sessions" ALTER COLUMN "completed_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "test_sessions" ADD COLUMN "question_ids" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "attempts_session_question_unique" ON "attempts" USING btree ("test_session_id","question_id");