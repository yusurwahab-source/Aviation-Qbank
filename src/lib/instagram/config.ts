import "server-only";

import { envValue } from "@/lib/env";

/**
 * What the Instagram agent needs from the environment, read tolerantly like
 * every other key here.
 *
 * `INSTAGRAM_POSTING_ENABLED=true` is the switch that turns the agent from
 * "show me what you would post" into "post it". Everything else can be set
 * first and checked with a dry run, so the account is never touched until the
 * owner has seen a real card and a real caption.
 */
export type InstagramConfig = {
  cronSecret: string | null;
  accountId: string | null;
  accessToken: string | null;
  postingEnabled: boolean;
};

export function instagramConfig(): InstagramConfig {
  return {
    cronSecret: envValue("CRON_SECRET"),
    accountId: envValue("INSTAGRAM_ACCOUNT_ID"),
    accessToken: envValue("INSTAGRAM_ACCESS_TOKEN"),
    postingEnabled: envValue("INSTAGRAM_POSTING_ENABLED")?.toLowerCase() === "true",
  };
}
