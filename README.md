# Aviation Type Rating Question Bank

Multiple-choice practice questions for student pilots working towards an
aircraft type rating. Choose an aircraft, answer questions one at a time, and
see how you did — including which topics let you down.

Built to hold **many aircraft types** from the start. Two are loaded today — the
Diamond DA40 and the Boeing 737-800 — and the second was added by writing
question files, not by rewriting the application.

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

## Built with

Next.js 16 (App Router) · TypeScript · Postgres · Drizzle ORM · Tailwind CSS v4 ·
Zod · Vitest. Intended to deploy on Vercel.

Development notes, conventions and the question schema are in
[`CLAUDE.md`](CLAUDE.md).
