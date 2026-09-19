# Aviation Type Rating Question Bank

Multiple-choice practice questions for student pilots working towards an
aircraft type rating. Choose an aircraft, answer questions one at a time, and
see how you did — including which topics let you down.

Built to hold **many aircraft types** from the start. Two are loaded today — the
Diamond DA40 and the Boeing 737-800 — and the second was added by writing
question files, not by rewriting the application. It grows the same way: each
FCOM chapter arrives as one more file in its folder.

## What works today

- An aircraft picker, showing how many questions each type has
- A test builder: tick the sections you want, and the number of questions
  available updates as you do. Choose any number of questions, or all of them
- A practice test drawn at random from that selection, one question per screen
- **Two ways to sit it.** *Study*: pick an option and the correct answer and
  its explanation appear straight away — that question is then settled, so
  your score still means something. *Exam*: nothing is shown until the end,
  and you can change your mind on the way through, closer to the real thing
- **A clock, in the exam.** An exam gives you one minute a question — twenty
  questions, twenty minutes — and hands itself in when the time runs out.
  There is nothing to set: the length of the test is the length of the clock.
  Study has no limit at all, just a counter showing how long you have taken.
  Reloading the page does not give you more time, or reset the counter
- **A map of the test.** Tap the answered count to see every question at once,
  jump straight to any of them, or go to the next one you skipped. In study
  mode it shows which you got right; in an exam it only shows what you have
  answered
- A result screen: your score, a breakdown by topic with the weakest first, and
  every question reviewed again with the correct answer and an explanation
- Accounts: sign up, log in, log out
- **A way back in if you forget your password.** Ask for a link by email, set
  a new password, and every other device is signed out. The link works once
  and lasts an hour
- Every answer a signed-in user gives is recorded as it's given, not only at
  the end — an abandoned test still counts, and refreshing mid-test resumes it
  rather than starting over
- **Your progress**: overall score, performance by topic (weakest first), a chart
  of how each test went, and the questions you got wrong last time — with a
  button to retry only those. Available overall and per aircraft.

Practising does not require an account — signing out never takes the question
bank away, and the result screen tells you whether the test was saved.

## Running it on your own machine

You need Node.js 20 or newer and a Postgres database. For the database, either
install Postgres locally or create a free one at
[Neon](https://neon.tech) or [Supabase](https://supabase.com) and copy the
connection string.

```bash
npm install

cp .env.example .env.local
# open .env.local and set DATABASE_URL to your database

npm run setup      # creates the tables, then loads the questions
npm run dev        # http://localhost:3000
```

If a page says the question bank is not available, `DATABASE_URL` is wrong or
the database has not been set up — run `npm run setup` again and read the error.

**Password reset needs no setup locally.** With no mail provider configured,
the reset link is printed in the terminal running `npm run dev` instead of
being sent. Copy it out and paste it into the browser. The screen says that
this is what is happening, so it cannot be mistaken for a form that silently
does nothing.

## Putting it online

The site needs two things: somewhere to run (Vercel) and a database (Neon).
Both have free plans, and neither needs anything installed on your computer.

1. **Create the database.** Sign up at [neon.tech](https://neon.tech), create a
   project, and copy its connection string. It looks like
   `postgresql://user:password@host/dbname?sslmode=require`.
2. **Create the site.** Sign up at [vercel.com](https://vercel.com) with your
   GitHub account and import this repository.
3. **Give the site the database.** In Vercel, under
   Settings → Environment Variables, add a variable named `DATABASE_URL` and
   paste the Neon connection string as its value.
4. **Deploy.** Vercel builds the site and gives you a link.

### Turning on password reset emails

Everything else works without this. Password reset does not: on the deployed
site, an unconfigured sender writes the link to a log nobody can read.

1. Sign up at [resend.com](https://resend.com) and verify a domain you own.
   (A domain is theirs to check, not something this app can do for you.)
2. Create an API key.
3. In Vercel, under Settings → Environment Variables, add:
   - `RESEND_API_KEY` — the key from step 2.
   - `EMAIL_FROM` — an address at that verified domain, e.g.
     `Aviation Question Bank <noreply@your-domain.com>`.
   - `APP_URL` — only if the site is on a custom domain. Without it, links
     point at the address Vercel reports, which is right for a
     `*.vercel.app` site.
4. Redeploy.

Using a different provider means editing one file, `src/lib/email/send.ts`.
Nothing else in the app knows how mail is sent.

Every deploy runs `npm run vercel-build`, which applies any database migrations
and loads `/content` into the database before building. So **deploying is also
how questions get published**: edit a question file, push it to `main`, and the
live site updates itself.

If you deploy before adding `DATABASE_URL`, the build will fail — which is the
intended behaviour. A site that builds successfully but has no questions in it
would be worse.

## Adding or editing questions

Questions are files in this repository, under `/content`. To change a question,
edit the file and run `npm run db:seed`.

To add an aircraft, add a folder:

```
content/a320/
  aircraft.json
  questions/
    hydraulics.json
```

Then `npm run db:seed`. Nothing else needs to change.

Every file is checked before it is loaded — the build stops and names the file
and the problem if anything is wrong. The full field list and the rules are in
[`content/README.md`](content/README.md) and [`CLAUDE.md`](CLAUDE.md).

## Commands

```bash
npm run dev                # development server
npm run check              # validate content + lint + typecheck + tests
npm run validate:content   # check the question files only
npm run db:seed            # load /content into the database
npm run build              # production build (validates content first)
npm run vercel-build       # what the deploy runs: migrate, seed, then build
```

## Commercialisation status

Plain-English summary of the "get ready to charge for this" work, for
whoever is deciding what ships and what to price — the technical version of
all of this is in [`CLAUDE.md`](CLAUDE.md).

### What is live right now

- **A free/premium split**, config-driven, enforced on the server (not just
  hidden in the interface — a determined visitor editing the page's URL by
  hand still cannot get more than the free plan allows).
- **`/pricing`** — three plans to choose from (3 months, 12 months, or
  lifetime, all one-time payments, no auto-renewal), a table comparing free
  against premium, a 30-day money-back guarantee line, and an FAQ. Since
  there is nowhere yet to actually pay, every "buy" button opens a short
  form instead ("join the early access list") that records an email and
  which aircraft the visitor needs, and confirms it was received.
- **`/admin`** — a second staff area (the existing `/owner` area is
  untouched) listing everyone who joined that early access list, and every
  "report a problem with this question" a student has sent in, with a way
  to mark a report resolved.
- **A "Report a problem with this question" link on every question**, in a
  test and on the results review, for signed-in and signed-out visitors
  alike.
- **Real `/terms`, `/privacy`, `/disclaimer` and `/contact` pages.** The
  disclaimer says plainly that this is an independent study aid, not
  affiliated with, authorised by or endorsed by Boeing or Diamond Aircraft,
  that the aircraft names are used only to say which type a question bank
  covers, and that nothing here replaces the FCOM, the AFM, or approved
  training.
- **Account self-service** — from a new "Account" page (in the account
  menu), a signed-in student can download everything stored about them as a
  file, or permanently delete their account.
- **A welcome email**, sent on sign-up, and the password reset email, both
  now styled to look like the product rather than a bare paragraph of text.
- A visual polish pass: loading skeletons instead of blank pages or bare
  spinners, a branded "something went wrong" page, and a fix to a
  screen-reader bug in the exam/study clock that had been silently
  announcing nothing at all.

There is **no cookie banner**, on purpose: the site sets no analytics or
advertising cookies (only the session cookie and a saved theme preference),
so there is nothing to ask consent for. Adding real analytics later would
need a banner added alongside it.

**Not done, on purpose:** "Sign in with Google". The application's log-in
system is hand-written (no third-party auth library), so there is nothing
already in place for it to plug into — adding it would mean building real
Google OAuth support from nothing, which is its own piece of work.

### What is gated behind Premium

On the **B737** specifically: 3 systems (Airplane General, Electrical, Fuel)
are free with full access; every other system is visible — shown as a
locked card with a lock icon and its question count, never hidden — but
needs Premium to actually use. The **DA40**, and every future aircraft
added the same way, stays fully free unless someone deliberately adds it to
the locked list.

Regardless of aircraft, a free account cannot:
- sit a test longer than 20 questions,
- use exam mode (timed, answers withheld until the end), or
- use the "smart test" shortcuts (weakest systems, questions answered
  wrong, flagged questions, unseen questions) — manually ticking sections
  still works.

This is a separate, simpler system from the free-question-per-aircraft
allowance already in the app before this work (still there, still working,
still what `/upgrade`'s existing monthly/every-3-months subscription
unlocks). The two are independent for now — see "what remains" below.

### Exactly what remains to actually accept payment

The three plans on `/pricing` are **not connected to a real payment
provider yet.** To turn them on:

1. **Pick a payment integration for one-time purchases.** The existing
   Stripe integration under `/upgrade` only knows how to sell a *recurring*
   subscription (monthly or every 3 months) — it cannot sell a fixed-length,
   one-time plan without changes. Either extend that integration (Stripe
   Checkout supports one-time prices too) or add a second one.
2. **Replace the "join early access" form** on `/pricing` with a real
   checkout button once that exists — same shape as the "Subscribe" button
   already working on `/upgrade`.
3. **Decide how a purchase turns a plan on.** This work added `plan` and
   `planExpiresAt` columns to the accounts table specifically so a one-time
   purchase can set them directly (no recurring subscription row needed) —
   but nothing wires a successful payment up to actually do that yet. That
   is a small, well-scoped piece of work once a provider is chosen: verify
   the payment (the same "never trust a webhook without checking its
   signature" rule the existing Stripe webhook already follows), then set
   those two columns.
4. **Decide what happens to the existing monthly/every-3-months plan.**
   Keep both side by side, retire the old one in favour of the new one-time
   plans, or fold them together — this is a product decision, not a
   technical blocker either way.
5. **Set real prices.** The numbers on `/pricing` today are placeholders —
   see below for where to change them.

### Config files to edit

| To change | Edit | Notes |
|---|---|---|
| **Prices on /pricing** | `src/config/plans.ts` — `PRICING_TIERS` | Each tier's `priceCents` (e.g. `2900` = $29.00) and `currency`. Nothing else on the page needs to change. |
| **Which systems are free** | `src/config/plans.ts` — `FREE_SYSTEMS` | One entry per aircraft code (e.g. `B737: [...]`); an aircraft with no entry stays fully free. Names must match the `topic` field in that aircraft's question files exactly. |
| **Free plan's other limits** (test length, exam mode, smart-test presets) | `src/config/plans.ts` — `PLAN_LIMITS` | `maxQuestionsPerTest: null` removes the cap; the two booleans turn exam mode and the smart-test presets on or off for the free plan. |
| **The pass mark** | `/owner/settings` on the live site — no file edit or deploy needed | Falls back to `DEFAULT_PASS_MARK_PERCENT` in `src/lib/settings.ts` (currently 75) if it has never been set. |
| **The existing free-question-per-aircraft allowance** | `/owner/settings`, same as the pass mark | Falls back to `FREE_QUESTIONS_PER_AIRCRAFT` in `src/lib/billing/access-policy.ts` (currently 20) — this is the older, separate allowance system; see "What is gated" above. |
| **Support/contact email shown on /contact, /terms, /privacy** | `src/config/site.ts` — `supportEmail` | Currently a placeholder address. |

## Built with

Next.js 16 (App Router) · TypeScript · Postgres · Drizzle ORM · Tailwind CSS v4 ·
Zod · Vitest. Intended to deploy on Vercel.

Development notes, conventions and the question schema are in
[`CLAUDE.md`](CLAUDE.md).
