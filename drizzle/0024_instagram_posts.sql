CREATE TABLE "instagram_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"posted_on" varchar(10) NOT NULL,
	"kind" varchar(8) NOT NULL,
	"content_ref" varchar(40) NOT NULL,
	"status" varchar(8) NOT NULL,
	"media_id" varchar(40),
	"permalink" text,
	"caption" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "instagram_posts_posted_on_unique" ON "instagram_posts" USING btree ("posted_on");--> statement-breakpoint
CREATE INDEX "instagram_posts_kind_ref_idx" ON "instagram_posts" USING btree ("kind","content_ref");