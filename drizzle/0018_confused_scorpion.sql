CREATE TABLE "class_questions" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"class_code" varchar(8) NOT NULL,
	"topic" varchar(60) NOT NULL,
	"subtopic" varchar(60),
	"question" text NOT NULL,
	"options" jsonb NOT NULL,
	"correct" varchar(4) NOT NULL,
	"explanation" text NOT NULL,
	"reference" text,
	"media" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" "question_status" DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_ratings" (
	"code" varchar(8) PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text NOT NULL,
	"status" "aircraft_status" DEFAULT 'active' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "class_questions" ADD CONSTRAINT "class_questions_class_code_class_ratings_code_fk" FOREIGN KEY ("class_code") REFERENCES "public"."class_ratings"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "class_questions_class_status_idx" ON "class_questions" USING btree ("class_code","status");--> statement-breakpoint
CREATE INDEX "class_questions_class_status_topic_idx" ON "class_questions" USING btree ("class_code","status","topic");