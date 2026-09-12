CREATE TYPE "public"."aircraft_status" AS ENUM('active', 'coming_soon');--> statement-breakpoint
CREATE TYPE "public"."question_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "aircraft" (
	"code" varchar(8) PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"manufacturer" varchar(120) NOT NULL,
	"variant" varchar(60),
	"description" text NOT NULL,
	"status" "aircraft_status" DEFAULT 'active' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"aircraft_code" varchar(8) NOT NULL,
	"topic" varchar(60) NOT NULL,
	"subtopic" varchar(60),
	"question" text NOT NULL,
	"options" jsonb NOT NULL,
	"correct" varchar(4) NOT NULL,
	"explanation" text NOT NULL,
	"reference" text,
	"difficulty" smallint NOT NULL,
	"media" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" "question_status" DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "questions_difficulty_range" CHECK ("questions"."difficulty" between 1 and 3)
);
--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_aircraft_code_aircraft_code_fk" FOREIGN KEY ("aircraft_code") REFERENCES "public"."aircraft"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "questions_aircraft_status_idx" ON "questions" USING btree ("aircraft_code","status");--> statement-breakpoint
CREATE INDEX "questions_aircraft_status_topic_idx" ON "questions" USING btree ("aircraft_code","status","topic");--> statement-breakpoint
CREATE INDEX "questions_aircraft_status_difficulty_idx" ON "questions" USING btree ("aircraft_code","status","difficulty");