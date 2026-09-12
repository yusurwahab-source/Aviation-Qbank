CREATE TABLE "attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"test_session_id" uuid NOT NULL,
	"question_id" varchar(40) NOT NULL,
	"aircraft_code" varchar(8) NOT NULL,
	"topic" varchar(60) NOT NULL,
	"selected_option_id" varchar(4),
	"is_correct" boolean NOT NULL,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"aircraft_code" varchar(8) NOT NULL,
	"client_test_id" varchar(64) NOT NULL,
	"question_count" smallint NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_test_session_id_test_sessions_id_fk" FOREIGN KEY ("test_session_id") REFERENCES "public"."test_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_sessions" ADD CONSTRAINT "test_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attempts_user_aircraft_topic_idx" ON "attempts" USING btree ("user_id","aircraft_code","topic");--> statement-breakpoint
CREATE INDEX "attempts_user_correct_idx" ON "attempts" USING btree ("user_id","aircraft_code","is_correct");--> statement-breakpoint
CREATE INDEX "attempts_user_question_idx" ON "attempts" USING btree ("user_id","question_id");--> statement-breakpoint
CREATE INDEX "attempts_session_idx" ON "attempts" USING btree ("test_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "test_sessions_user_client_test_unique" ON "test_sessions" USING btree ("user_id","client_test_id");--> statement-breakpoint
CREATE INDEX "test_sessions_user_completed_idx" ON "test_sessions" USING btree ("user_id","completed_at");--> statement-breakpoint
CREATE INDEX "test_sessions_user_aircraft_completed_idx" ON "test_sessions" USING btree ("user_id","aircraft_code","completed_at");