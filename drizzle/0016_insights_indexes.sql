CREATE INDEX "gift_code_redemptions_user_idx" ON "gift_code_redemptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "gift_code_redemptions_redeemed_at_idx" ON "gift_code_redemptions" USING btree ("redeemed_at");--> statement-breakpoint
CREATE INDEX "subscriptions_status_period_end_idx" ON "subscriptions" USING btree ("status","current_period_end");