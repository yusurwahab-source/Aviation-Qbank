# Aviation Type Rating Question Bank

Multiple-choice practice questions for student pilots working towards an
aircraft type rating. Choose an aircraft, answer questions one at a time, and
see how you did — including which topics let you down.

Built to hold **many aircraft types** from the start. Only the Diamond DA40 is
loaded today; adding an A320 or a B737 later means adding question files, not
rewriting the application.

## What works today (Phase 1)

- An aircraft picker, showing how many questions each type has
- An aircraft page listing the topics in its bank
- A practice test of 5, 10 or 20 questions, drawn at random, one question per screen
- A result screen: your score, a breakdown by topic with the weakest first, and
  every question reviewed with the correct answer and an explanation

There are no user accounts yet, and results are not saved. That is Phases 2 and 3.

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
```

## Built with

Next.js 16 (App Router) · TypeScript · Postgres · Drizzle ORM · Tailwind CSS v4 ·
Zod · Vitest. Intended to deploy on Vercel.

Development notes, conventions and the question schema are in
[`CLAUDE.md`](CLAUDE.md).
