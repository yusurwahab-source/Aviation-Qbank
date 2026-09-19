/**
 * Whether the signed-in user is the site's owner.
 *
 * Pure, like the rest of the auth rules: given the account's email and the
 * configured owner email, no session, no database. `OWNER_EMAIL` is read
 * through `envValue` by the one caller (`/owner/gift-codes`), the same
 * tolerant reading every other configuration value in this app gets.
 *
 * Deliberately just an email match, not a role column: there is exactly one
 * owner today, and a real roles table is the wrong thing to build before a
 * second one exists.
 */
export function isOwner(userEmail: string, ownerEmail: string | null): boolean {
  if (!ownerEmail) return false;
  return userEmail.trim().toLowerCase() === ownerEmail.trim().toLowerCase();
}
