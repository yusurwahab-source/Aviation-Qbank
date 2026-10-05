/**
 * Who a broadcast may be aimed at.
 *
 * Pure data: the SQL that turns one of these into a list of accounts lives
 * in `db/broadcasts.ts`, beside the other query that reads every user. The
 * four audiences are the four things an owner actually wants to say
 * something to — everyone, the people paying, the people not, and the people
 * about to stop — and they reuse the accounts screen's own definitions of
 * "active" and "expiring soon" so the two never disagree about who is who.
 */

export const AUDIENCES = ["everyone", "subscribers", "free", "expiring"] as const;
export type Audience = (typeof AUDIENCES)[number];

export const AUDIENCE_LABELS: Record<Audience, { label: string; description: string }> = {
  everyone: { label: "Everyone", description: "Every account." },
  subscribers: { label: "Subscribers", description: "Accounts with active access, paid or gifted." },
  free: { label: "Free accounts", description: "Accounts with no active access." },
  expiring: {
    label: "Expiring soon",
    description: "Accounts whose access ends within two weeks.",
  },
};

export function isAudience(value: unknown): value is Audience {
  return typeof value === "string" && (AUDIENCES as readonly string[]).includes(value);
}
