CREATE TABLE "mailbox_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"direction" varchar(3) NOT NULL,
	"source" varchar(8) NOT NULL,
	"from_address" varchar(254) NOT NULL,
	"from_name" varchar(120),
	"to_address" varchar(254) NOT NULL,
	"subject" varchar(300) NOT NULL,
	"text_body" text NOT NULL,
	"reply_to" varchar(254),
	"provider_id" varchar(64),
	"in_reply_to_id" uuid,
	"status" varchar(8) NOT NULL,
	"error" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "mailbox_messages_box_created_idx" ON "mailbox_messages" USING btree ("direction","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "mailbox_messages_provider_id_unique" ON "mailbox_messages" USING btree ("provider_id");