CREATE TABLE "preview_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_id" varchar(64) NOT NULL,
	"question_id" varchar(40) NOT NULL,
	"aircraft_code" varchar(8) NOT NULL,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "preview_attempts_visitor_question_unique" ON "preview_attempts" USING btree ("visitor_id","question_id");--> statement-breakpoint
CREATE INDEX "preview_attempts_visitor_aircraft_idx" ON "preview_attempts" USING btree ("visitor_id","aircraft_code");--> statement-breakpoint
CREATE INDEX "preview_attempts_answered_at_idx" ON "preview_attempts" USING btree ("answered_at");