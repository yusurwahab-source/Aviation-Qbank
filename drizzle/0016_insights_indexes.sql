-- IF NOT EXISTS for the same reason 0015 now uses it throughout: safe to
-- rerun regardless of how far a previous, partially-failed deploy attempt
-- got.
CREATE INDEX IF NOT EXISTS "gift_code_redemptions_user_idx" ON "gift_code_redemptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gift_code_redemptions_redeemed_at_idx" ON "gift_code_redemptions" USING btree ("redeemed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_status_period_end_idx" ON "subscriptions" USING btree ("status","current_period_end");
