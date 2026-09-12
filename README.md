# Aviation Type Rating Question Bank

Multiple-choice practice questions for student pilots working towards an
aircraft type rating. Choose an aircraft, answer questions one at a time, and
see how you did — including which topics let you down.

Built to hold **many aircraft types** from the start. Only the Diamond DA40 is
loaded today; adding an A320 or a B737 later means adding question files, not
rewriting the application.

## What works today (Phase 3)

- An aircraft picker, showing how many questions each type has
- An aircraft page listing the topics in its bank
- A practice test of 5, 10 or 20 questions, drawn at random, one question per screen
- A result screen: your score, a breakdown by topic with the weakest first, and
  every question reviewed with the correct answer and an explanation
- Accounts: sign up, log in, log out
- Every answer a signed-in user submits is recorded

Practising does not require an account — signing out never takes the question
bank away, and the result screen tells you whether the test was saved. Nothing
reads that history back yet: the report screens are Phase 4.

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
