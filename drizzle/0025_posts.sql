CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" varchar(8) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"title" varchar(200) NOT NULL,
	"excerpt" varchar(320) NOT NULL,
	"body" text NOT NULL,
	"cover_image_url" text,
	"cover_image_alt" varchar(200),
	"category" varchar(60),
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"references" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_name" varchar(120),
	"source_url" text,
	"source_published_on" varchar(10),
	"status" varchar(10) DEFAULT 'draft' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"seo_title" varchar(70),
	"seo_description" varchar(170),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "posts_kind_slug_unique" ON "posts" USING btree ("kind","slug");--> statement-breakpoint
CREATE INDEX "posts_kind_status_published_idx" ON "posts" USING btree ("kind","status","published_at");