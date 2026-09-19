CREATE TABLE "question_stats" (
	"question_id" varchar(40) PRIMARY KEY NOT NULL,
	"first_attempts" integer DEFAULT 0 NOT NULL,
	"first_attempts_correct" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce(question, '') || ' ' || coalesce(explanation, '') || ' ' || coalesce(jsonb_path_query_array(options, '$[*].text')::text, ''))) STORED;--> statement-breakpoint
CREATE INDEX "questions_search_vector_idx" ON "questions" USING gin ("search_vector");