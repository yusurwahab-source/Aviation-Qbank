# PilotQBank — Handover & Audit

Prepared for passing the running of this site to a new person. It contains
**no secrets** — only where each one lives. Items marked **[CONFIRM]** cannot be
seen from the repository (they live in third-party dashboards); the current
owner must check them before handing over.

Read `CLAUDE.md` after this: it is the full description of how the code works.

## 1. What the platform is made of

| Piece | What it does | Where it lives | Evidence in repo |
|---|---|---|---|
| **GitHub** | Source code, and the only way content is published | `github.com/yusurwahab-source/Aviation-Qbank` (personal account, branch `main`) | `git remote`; `.github/workflows/ci.yml` |
| **Vercel** | Hosts the site; every push to `main` deploys | Vercel project, public address `aviation-qbank.vercel.app` | `src/config/site.ts`, `npm run vercel-build` |
| **Postgres** | All data: accounts, answers, subscriptions, questions | Hosted database (Neon or Supabase — **[CONFIRM which]**) | `DATABASE_URL`, `drizzle/` migrations |
| **Stripe** | Takes subscription payments (live mode active) | Stripe account, 2 recurring Prices + 1 webhook endpoint | `src/lib/billing/`, `/api/webhooks/stripe` |
| **Resend** | Sends password-reset email | Resend account + a verified sending domain — **[CONFIRM it is set up]** | `src/lib/email/send.ts` |
| **Google Fonts** | Typefaces, fetched at build time | Public, no account | `src/app/fonts.ts` |
| **Domain name** | Custom address, if any | **[CONFIRM]** — the repo only knows the `.vercel.app` address | `APP_URL` |

Next.js 16, TypeScript, Tailwind v4, Drizzle ORM. No other paid service is used.

## 2. Accounts to transfer or share (checklist)

For each, the new person needs their own login added **before** the old owner
steps back — never hand over by sharing one password.

- [ ] **GitHub** — repo is under a *personal* account. Add the new person as a
  collaborator (Admin), or move the repo to a GitHub Organization.
- [ ] **Vercel** — add them as a team member; check the project's Git
  connection points at the repo above.
- [ ] **Database host** — add them as a member; confirm automatic backups are on.
- [ ] **Stripe** — add them as a team user; they will need to see Products,
  Prices, Webhooks, and the customer list. Confirm payout bank details are
  the owner's intended ones.
- [ ] **Resend** — add them, and confirm the sending domain's DNS records.
- [ ] **Domain registrar / DNS** — if a custom domain exists.
- [ ] **The site's own owner login** — see §4. This is an account *inside* the app.
- [ ] A **password manager** shared vault holding all of the above.

## 3. Environment variables (set in Vercel → Project → Settings → Environment Variables)

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | **Yes** — build and site fail without it | Postgres connection string |
| `DATABASE_POOL_MAX` | No (default 5) | Lower to 1 on small serverless plans |
| `APP_URL` | If a custom domain is used | Address placed in emailed links |
| `RESEND_API_KEY`, `EMAIL_FROM` | For real password-reset email | Without them the reset link only goes to the server log, so **password reset is unusable for students** |
| `STRIPE_SECRET_KEY` | For payments | Should be a *restricted* key (`rk_live_…`) with only "Checkout Sessions: write" |
| `STRIPE_WEBHOOK_SECRET` | For payments | Signing secret of the webhook endpoint (`whsec_…`) |
| `STRIPE_MONTHLY_PRICE_ID`, `STRIPE_QUARTERLY_PRICE_ID` | For payments | The two live recurring Prices |
| `OWNER_EMAIL` | For `/owner` | The one email address allowed into the owner console |

Paste the **value only** into Vercel, not `NAME=value`. **[CONFIRM]** each of
these exists in Production and that none still holds a `test` key.

## 4. How the owner role works — important

There is **no role column and no second admin**. `/owner` opens for exactly one
account: the one whose email equals `OWNER_EMAIL`. To hand over:

1. The new person signs up on the site with their own email.
2. Change `OWNER_EMAIL` in Vercel to that email and redeploy.
3. The old owner's account becomes an ordinary account.

If both people should have access, that is a feature that does not exist yet.
Everything the owner does at `/owner` is written to an audit log
(`/owner/audit-log`).

## 5. How things get changed

| To do this | Do this |
|---|---|
| Add or edit questions | Edit JSON under `content/…`, push to `main`. The deploy validates and loads them. Never edit questions in the database — the next deploy overwrites them. |
| Add an aircraft / subject | Add a folder under `content/` — no code change needed |
| Add a Pilot Sim | HTML file in `public/pilot-sims/`, entry in `src/app/pilot-sims/sims.ts`, a `page.tsx` beside the existing ones, and a line in `src/lib/seo/sitemap-entries.ts` |
| Change prices | Create a new Price in Stripe (tax behaviour **inclusive**, product tax code set), then point the env var at it. Prices cannot be edited once created. |
| Change free allowance, banner, pass mark, hide a section | `/owner/settings` — no deploy |
| Give someone free access | `/owner/accounts/<id>` (grant) or `/owner/gift-codes` |
| Run checks before pushing | `npm run check` |

A push to `main` **is** a production release: the deploy runs migrations, seeds
content, then builds. If the database is unreachable, the deploy fails rather
than going live broken. CI (`.github/workflows/ci.yml`) runs the same checks
against a throwaway Postgres.

## 6. What is working, and what is not (honest status)

**Working:** three question sections, accounts, resumable tests, progress
reports, free tier + Stripe subscriptions (one real live payment verified),
gift codes, owner console, Pilot Sims.

**Known gaps a new owner should know about** (details in `CLAUDE.md` → "Known gaps"):

1. **No email verification** — anyone can register with an address they do not own.
2. **No self-service cancellation page** — students cancel through Stripe's
   receipt email / customer portal. A *refund does not cancel* a subscription;
   cancel it separately in Stripe.
3. **Housekeeping tables are never swept** (expired sessions, rate-limit rows).
   Tidiness only, not correctness.
4. **No "password changed" email.**
5. **Question content is not independently reviewed.** The
   Principles of Flight bank was written by an AI assistant, not taken from a
   syllabus or checked against one; it should be reviewed by a qualified
   instructor before students rely on it. The DA40 bank is from the AFM.
   Twenty-six B737 questions turn on figures nobody has confirmed twice (list in
   `content/README.md`).
6. **`npm audit` shows advisories** (a development-only tool chain). Not
   reachable from the deployed site; re-check periodically.
7. **VOR/NDB simulator loads Tailwind from a public CDN**
   (`cdn.tailwindcss.com`) inside the file. That CDN script is meant for
   prototyping, adds a third-party dependency to a page the rest of the project
   keeps to Google Fonts only, and the simulator breaks if that CDN is down.
   Its internals are not edited from this repo — ask the author for a version
   with the CSS built in.

## 7. Sustainability: is this a running business?

- **Revenue path exists and works:** free allowance per aircraft, then a monthly
  or quarterly subscription via Stripe. Flying Knowledge and Pilot Sims are free.
- **Running costs** (**[CONFIRM]** the plan on each): Vercel, the database host,
  Resend, Stripe's per-transaction fee, a domain. All have free or low tiers at
  small scale; the database and Vercel are the ones that grow with usage.
- **Biggest risk is people, not code:** one GitHub account, one owner email,
  and secrets that exist only in dashboards. Section 2 is what removes that risk.
- **Legal:** prices are quoted VAT-inclusive (EU). `/terms` and `/privacy`
  exist — **[CONFIRM]** they have been reviewed by someone qualified, and that
  the business details Stripe holds match reality.

## 8. First week for the new person

1. Get access to everything in §2; check every **[CONFIRM]** item.
2. Clone the repo, `cp .env.example .env.local`, set a *local* `DATABASE_URL`,
   run `npm run setup`, then `npm run dev`.
3. Run `npm run check` — it should pass before you change anything.
4. In Stripe, send one test event to the webhook and confirm it is accepted.
5. Request a password reset on the live site and confirm the email arrives.
6. Rotate any secret that was ever pasted into chat, email or a shared document.
