# CLAUDE.md — Aviation Type Rating Question Bank

Working notes for this repository. Keep this file current: it is the agreed
description of how the project is built, not a historical record.

## What this is

A web application where student pilots practise multiple-choice questions for
aircraft type ratings. All user-facing content is in English.

**Current state: Phase 1 is complete.** A user can choose an aircraft, answer
questions one at a time, and see a result screen. There are no accounts and
nothing is saved yet.

## The rule that shapes everything: many aircraft

The platform supports several aircraft types, each with its own question bank.
Only the DA40 exists today, but nothing in the code knows that.

Every table, route, query and report is keyed by aircraft code:

- `content/<code>/` — one folder per aircraft
- `aircraft` and `questions` tables — `questions.aircraft_code` on every row
- `/aircraft/[code]` and `/aircraft/[code]/test` — aircraft is part of the URL
- every query in `src/db/queries.ts` takes an aircraft code

**Adding an aircraft must stay a content-only job.** If a change would require
editing application code to add a second or third type, it is the wrong change.
This was verified by adding an A320 folder, seeding, browsing it end to end, and
removing it again — no code was touched.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server on http://localhost:3000 |
| `npm run build` | Validates content, then builds for production |
| `npm run start` | Runs the production build |
| `npm run setup` | `db:migrate` then `db:seed` — the one command after a fresh clone |
| `npm run db:migrate` | Applies pending migrations from `/drizzle` |
| `npm run db:seed` | Validates content, then loads `/content` into the database |
| `npm run db:generate` | Writes a new migration after changing `src/db/schema.ts` |
| `npm run db:studio` | Opens Drizzle Studio to browse the database |
| `npm run validate:content` | Checks every question file against the schema |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run test` | Unit tests (Vitest) |
| `npm run check` | validate + lint + typecheck + test. Run this before pushing. |

First run after cloning:

```bash
npm install
cp .env.example .env.local     # then set DATABASE_URL
npm run setup
npm run dev
```

## Question schema

Questions live in `/content/<aircraft>/questions/*.json`, each file a JSON array.
The schema is defined once, in `src/content/schema.ts`, and everything else uses
it. Changes to the shape of a question go there first.

| Field | Required | Rules |
|---|---|---|
| `id` | yes | `AIRCRAFT-TOPICCODE-NNNN`, e.g. `DA40-ELEC-0042`. Unique across the whole repository. The aircraft prefix must match the `aircraft` field. |
| `aircraft` | yes | Uppercase type code, e.g. `DA40`. Must match the folder name in lowercase. |
| `topic` | yes | Main subject, e.g. `Electrical`. This is what reports group by, so spelling must be consistent. |
| `subtopic` | no | Narrower subject, e.g. `Alternator failure`. |
| `question` | yes | The question text. |
| `options` | yes | 2–5 choices, each `{ "id": "a", "text": "..." }`. Option ids unique within the question. |
| `correct` | yes | The `id` of the correct option. Must exist in `options`. |
| `explanation` | yes | Why the answer is correct. Shown on the result screen. |
| `reference` | no | Source, e.g. `Airplane Flight Manual, Section 7 - Fuel System`. |
| `difficulty` | yes | `1` (easy), `2` (moderate) or `3` (hard). |
| `media` | no | Image path. Reserved — not used yet, but valid to author. |
| `tags` | no | Array of short strings. |
| `status` | yes | `draft` or `published`. **Only `published` is ever shown to users.** |
| `version` | yes | Integer, starts at 1, increment when the question is edited. |

Unknown fields are an error, not a silent loss: `explaination` fails the build
rather than quietly dropping the explanation.

### Content is the source of truth

`npm run db:seed` syncs the database to the files: it inserts, updates by id,
and **deletes** rows whose files are gone. It is safe to run repeatedly. Never
edit questions directly in the database — the next seed will overwrite them.

### Failing loudly

`npm run validate:content` runs before `next build` and before `db:seed`. A
malformed file stops both, printing the file, the field and the problem. There
is no path by which bad content reaches a user.

## Stack, and why

The brief's suggested stack, adopted as-is:

- **Next.js 16 + TypeScript** (App Router) — server components mean the answer key
  can stay on the server; one framework for pages and API.
- **Postgres + Drizzle ORM** — SQL that is visible and reviewable, migrations as
  files in the repo. Works with Neon or Supabase without changes.
- **Tailwind CSS v4** — styling in the markup, one small token palette in
  `src/app/globals.css`.
- **Vercel** for deployment.

Two small deviations, both to remove a dependency rather than add one:

- **No web font.** The app uses the system font stack. `next/font/google`
  fetches fonts at build time, which makes the build depend on the network for
  no user-visible benefit at this stage.
- **Zod for content validation.** Needed anyway to make the build fail loudly on
  bad question files, so it is also used to validate the server action input.

## Conventions

**The answer key never reaches the browser mid-test.** `pickTestQuestions`
selects only the columns a user may see. `correct` and `explanation` arrive only
after the test is submitted and graded server-side. Anything that would send
them earlier is a bug, however convenient.

**Grading is a pure function.** `src/lib/grading.ts` takes questions and answers
and returns a result — no database, no React. It is unit tested, and Phase 3
will reuse it unchanged when attempts start being recorded.

**Untrusted input is parsed, not trusted.** URL parameters go through
`parseTestLength`; the server action parses its input with Zod and re-reads the
answer key from the database scoped to the aircraft and to `published`.

**Database errors are explained, not thrown at the user.** Pages that read the
database catch failures and render `DatabaseUnavailable`, which names the two
commands that fix it.

**One feature per session, one pull request per feature. `main` always works.**

## Layout

```
content/                      Question files. The source of truth.
drizzle/                      Generated SQL migrations. Committed.
scripts/
  validate-content.ts         Schema check. Runs before build and seed.
  migrate.ts                  Applies migrations.
  seed.ts                     Syncs content into the database.
src/
  app/
    page.tsx                  Aircraft picker
    aircraft/[code]/          Aircraft overview
    aircraft/[code]/test/     Test runner, grading action, result screen
  components/                 Shared UI
  content/
    schema.ts                 THE question schema
    load.ts                   Reads and validates /content
  db/
    schema.ts                 Drizzle tables
    queries.ts                Every read the app performs
    index.ts                  Connection pool
  lib/
    grading.ts                Scoring (pure, tested)
    test-options.ts           Test length parsing and limits
tests/                        Vitest unit tests
```

## Build order

1. **Phase 1 — the core loop. Done.** Pick an aircraft, answer questions one by
   one, see a result screen. No accounts.
2. **Phase 2 — accounts.** Sign up, log in, log out.
3. **Phase 3 — attempt recording.** Persist every answer: user, question,
   aircraft, selected option, correct or not, timestamp, test session.
4. **Phase 4 — reports.** Overall score, performance by topic (the most
   important view), progress over time, retry incorrect questions. Scoped per
   aircraft and overall.
5. **Phase 5 — refinement.** Filter by topic and difficulty, test length, timed
   mode, review mid-test.

Do not start a phase until the previous one works.

## Not in scope yet

Payments, subscriptions, an admin panel, images in questions, mobile apps, exam
simulation modes. The data model must not make these harder later, but none of
them get built now.

Questions are authored as repository files. If questions ever need to be written
from inside the website, an admin panel gets added then — the `status`,
`version` and `media` fields exist so that path stays open.

## Known gaps, honestly

- **A mid-test page refresh restarts the test.** Answers live in browser memory
  only. This is fine while nothing is saved; Phase 3 gives test sessions a
  database row and fixes it properly.
- **`order by random()`** picks test questions. Correct and fast for banks of
  this size; revisit if a bank ever reaches hundreds of thousands of questions.
- **The DA40 questions are a starter set**, written to exercise the system.
  They should be checked against the AFM before anyone studies from them. See
  `content/README.md`.
- **`npm audit` reports a moderate advisory** in `esbuild`, reached through
  `drizzle-kit`. It affects a development server only, never the deployed app.
  The fix is a breaking downgrade of `drizzle-kit`, so it is being left until
  upstream updates.
