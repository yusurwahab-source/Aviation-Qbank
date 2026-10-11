/**
 * Temporary free mode: every signed-in student gets full access, subscriptions
 * are switched off, and the pricing pages are hidden.
 *
 * This is the ONE switch. Set it to `false` once content, payment and
 * subscription settings are finished, and the site goes back to the free
 * allowance per aircraft, `/pricing`, `/upgrade` and the upgrade prompt, with
 * no other edit.
 *
 * Static data with no environment reads and no `server-only` import, like
 * `site.ts`, so server and client components can both import it.
 *
 * What it changes:
 *  - a signed-in account is never capped or sent to a paywall
 *    (`hasFullAccess` in `lib/billing/access-policy.ts`);
 *  - the upgrade dialog, the upgrade banners and the "Upgrade" prompts in the
 *    test screens do not render;
 *  - `/pricing` and `/upgrade` answer 404, nothing links to them, and the
 *    checkout action refuses, so no real Stripe checkout can be started;
 *  - the pricing page leaves `sitemap.xml`; "Premium soon" badges are hidden.
 *
 * What it deliberately does not change:
 *  - a signed-out visitor keeps the small preview allowance, so signing up is
 *    still what unlocks everything;
 *  - Stripe's webhook, the `subscriptions` table and the owner screens keep
 *    working, so nothing already paid for is lost;
 *  - `/redeem` (it also redeems Logbook Scanner unlock codes);
 *  - the Logbook Scanner's own meter and its text (it is a separate product).
 */
export const FREE_MODE = true;
