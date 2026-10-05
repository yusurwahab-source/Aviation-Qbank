CREATE TABLE "broadcast_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"broadcast_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"email" varchar(254) NOT NULL,
	"status" varchar(12) DEFAULT 'queued' NOT NULL,
	"error" varchar(200),
	"claimed_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"unsubscribe_token_hash" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broadcasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject" varchar(150) NOT NULL,
	"body" text NOT NULL,
	"audience" varchar(24) NOT NULL,
	"only_confirmed" boolean DEFAULT true NOT NULL,
	"created_by_email" varchar(254) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "broadcast_opt_out_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "broadcast_deliveries" ADD CONSTRAINT "broadcast_deliveries_broadcast_id_broadcasts_id_fk" FOREIGN KEY ("broadcast_id") REFERENCES "public"."broadcasts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_deliveries" ADD CONSTRAINT "broadcast_deliveries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "broadcast_deliveries_broadcast_user_unique" ON "broadcast_deliveries" USING btree ("broadcast_id","user_id");--> statement-breakpoint
CREATE INDEX "broadcast_deliveries_broadcast_status_idx" ON "broadcast_deliveries" USING btree ("broadcast_id","status");--> statement-breakpoint
CREATE INDEX "broadcast_deliveries_unsubscribe_hash_idx" ON "broadcast_deliveries" USING btree ("unsubscribe_token_hash");--> statement-breakpoint
CREATE INDEX "broadcasts_created_at_idx" ON "broadcasts" USING btree ("created_at");