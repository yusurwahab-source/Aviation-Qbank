# CLAUDE.md — Aviation Type Rating Question Bank

Working notes for this repository. Keep this file current: it is the agreed
description of how the project is built, not a historical record.

## What this is

A web application where student pilots practise multiple-choice questions for
aircraft type ratings. All user-facing content is in English.

**Current state: Phase 4 is complete, and Phase 5 is under way.** A user can
choose an aircraft, build a test from any combination of sections and any number
of questions, answer them one at a time, and see a result screen. Accounts exist,
every answer a signed-in user submits is recorded, and `/progress` reads that
history back: overall score, performance by topic, progress over time, and the
questions worth retrying.

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
| `npm run vercel-build` | What the deploy runs: migrate, seed, then build. Not for local use. |
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
reused it unchanged: `recordTestResult` writes the rows straight from its
output.

**Untrusted input is parsed, not trusted.** URL parameters go through
`parseTestLength` and `parseTopics`; the server action parses its input with Zod
and re-reads the answer key from the database scoped to the aircraft and to
`published`.

**A test is described by the URL, and the URL has no ceiling in it.** The test
page takes `?topic=` repeated once per section and `?questions=` as any whole
number or the word `all`. There is deliberately no maximum length constant: the
real limit is how many questions exist, which `countTestQuestions` reports and
`resolveTestSize` applies. A clamp in the parser would have had to guess a
number, and would have been wrong the moment a bank grew past it.

Two properties follow, and both are tested:

1. **The button never promises more than it delivers.** The builder shows the
   count for the current selection and puts that resolved number in the link, so
   a request for 500 out of 4 says "only 4 available" on screen rather than
   silently handing back a short test. `all` is the exception that stays a word
   in the URL — its point is to follow the bank as it grows.
2. **A mangled link still gives a test.** An unreadable length falls back to the
   default, an unknown section name simply matches nothing, and no section at all
   means every section. A student following a stale link gets questions, not an
   error.

**The per-section counts are sent once and the arithmetic happens in the
browser.** `listTopics` already returns a count per section, so the running total
updates on every tick without a request. The server still counts for itself when
the test is built — the browser's figure decides what to show, never what to
serve.

**Database errors are explained, not thrown at the user.** Pages that read the
database catch failures and render `DatabaseUnavailable`, which names the two
commands that fix it.

**Deploying is how content ships.** Vercel runs `vercel-build`, which applies
migrations and seeds `/content` before building. Pushing a question file to
`main` therefore publishes it. The consequences are deliberate: the build fails
if the database is unreachable, and a deploy always leaves the live database
matching the files in the repository. A separate seed step someone has to
remember would be the worse trade — a site that builds green with an empty
question bank.

**Passwords are hashed with scrypt from Node's own crypto, at OWASP's stated
minimum cost (N=2^17, r=8, p=1 — about 128 MB and half a second per hash). No
password library is installed: `src/lib/password.ts` is a pure, unit-tested
module. Each hash stores the parameters it was made with, so the cost can be
raised later and `needsRehash` upgrades stored passwords at the owner's next
login without locking anyone out.**

**Sessions live in the database, not in a signed token.** The cookie holds a
random 256-bit value; the `sessions` table stores only its SHA-256. So reading
the table gives an attacker nothing usable, and logging out actually revokes
access everywhere rather than waiting for a token to expire.

**Log in never reveals whether an email is registered.** Wrong password and
unknown email return the same message, and an unknown email is still verified
against `unmatchableHash()` so both cost the same time. Measured: 3.8% apart,
well inside the noise. Anything that makes one path faster than the other
reintroduces the leak.

**The attempt log is append-only, and stands on its own.** `attempts` rows
describe what happened at a moment in time and are never updated. `topic` and
`aircraftCode` are stored on the row rather than read through a join, and there
is deliberately **no foreign key to `questions`**.

The reason is concrete: `db:seed` deletes questions whose content files are
gone. A foreign key would either erase a pilot's history (cascade) or fail the
deploy (restrict). Neither is acceptable — editing content must never rewrite
the past, and the past must never block an edit. This was verified by deleting a
question, re-seeding, and confirming the attempt row and the topic report
survived intact. Reports join to `questions` only when they need current
wording, and skip questions that no longer exist.

**One test can never be recorded twice.** The browser generates a
`clientTestId` when a test starts; a unique index on `(user_id, client_test_id)`
turns a double-click or a retried request into a no-op. Every report is built on
this data, so a duplicated test would quietly corrupt all of them. The session
row and all its attempts are written in one transaction — a half-written test
would be worse than none.

**A failed save is never dressed up as a success.** If recording fails, the user
still sees their score, and the screen says plainly that it was not saved.
Someone revising for a type rating will decide what to study from a history they
believe is complete.

**Log in is rate limited, and the check runs before the password is verified.**
Verification costs half a second of CPU and 128 MB by design, so checking first
is what stops a flood of guesses exhausting the server — the limit protects the
machine as much as the accounts. Measured: a blocked attempt costs ~50ms against
~774ms for one that proceeds.

Three properties hold, and any change must keep all three:

1. **Nothing is ever locked permanently.** Both rules expire on their own. This
   is not a preference — there is no password reset, so a permanent lock would
   be unrecoverable without deleting the user's row by hand.
2. **Counting is keyed on the submitted email whether or not an account
   exists.** Counting only real accounts would make the difference in behaviour
   a way to discover which addresses are registered, undoing the property above.
3. **The counters live in the database, never in memory.** On Vercel the app
   runs as short-lived instances that share no memory, so an in-memory counter
   would reset constantly and an attacker would walk straight past it.

A correct password is refused while a block stands — otherwise a lucky guess
during the block would still get in, which is the whole thing the limit exists
to prevent. Succeeding clears that email's failures but deliberately leaves the
address count, so one correct log in cannot reset the broad brake and carry on
guessing other accounts.

**Every report query takes a `userId` and filters on it.** A report is somebody's
private study history; a missing user filter would show it to the wrong person.
Tests assert this directly by giving two accounts different histories and
checking neither can see the other's.

**The retry list is "most recent answer was wrong", not "ever got wrong".** A
question you have since answered correctly is not worth drilling again, and a
list that never shrinks is one nobody uses. It joins to `questions`, so anything
deleted from content drops out of the list while still counting in the totals —
verified by deleting a question and checking both halves of that behaviour.

**Charts are inline SVG, with no charting dependency.** One small line chart does
not justify one, and this way the marks use the house palette directly. The
conventions the chart follows — single series so no legend, 2px line, ≥8px
markers with a 2px surface ring, ~10% area wash, hairline solid gridlines, only
the endpoint labelled, and a table view as the accessible equal of the picture —
are worth keeping if another chart is ever added.

**The integration tests run against a real Postgres with the content seeded.**
Several of them — the reports, the retry list, the section queries — are about
behaviour over real questions: which are published, which section they are in,
what survives a question being deleted. They skip themselves when `DATABASE_URL`
is unset, so CI sets one and runs `db:migrate` *and* `db:seed` before `npm run
test`. Migrating without seeding leaves the tables empty, which does not make
those tests pass — it makes them fail, because an empty bank is not a bank.

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
    (auth)/                   Sign up, log in, log out
    progress/                 Reports, overall and per aircraft
  components/                 Shared UI
  content/
    schema.ts                 THE question schema
    load.ts                   Reads and validates /content
  db/
    schema.ts                 Drizzle tables
    queries.ts                Every read the app performs
    users.ts                  Account reads and writes
    index.ts                  Connection pool
  lib/
    grading.ts                Scoring (pure, tested)
    password.ts               scrypt hashing (pure, tested)
    test-options.ts           Test length and section parsing, and test URLs
    auth/
      credentials.ts          Email and password rules (pure, tested)
      rate-limit-policy.ts    When to refuse a log in (pure, tested)
      client-ip.ts            The caller's address, behind Vercel's proxy
      session.ts              Cookie and session table handling
tests/                        Vitest unit tests
```

## Build order

1. **Phase 1 — the core loop. Done.** Pick an aircraft, answer questions one by
   one, see a result screen. No accounts.
2. **Phase 2 — accounts. Done.** Sign up, log in, log out.
3. **Phase 3 — attempt recording. Done.** Every answer persisted: user,
   question, aircraft, selected option, correct or not, timestamp, test session.
4. **Phase 4 — reports. Done.** Overall score, performance by topic (the most
   important view), progress over time, retry incorrect questions. Scoped per
   aircraft (`/progress/[code]`) and overall (`/progress`).
5. **Phase 5 — refinement.** The test builder is done: the student picks any
   sections and any number of questions, reached from the aircraft page and from
   each row of the progress report. Still to do: filter by difficulty, timed
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
- **Only the `Fuel System` questions come from the owner's source.** The other
  topics were written to exercise the system and have not been checked against
  the DA 40 D AFM. The `Powerplant` questions are drafted outright because they
  describe a piston engine on AVGAS, which contradicts the diesel variant. See
  `content/README.md`.
- **An aircraft's display name can change; its code must not.** The code is the
  URL segment, the prefix of every question id, and the value stored on every
  past attempt. Renaming the DA40 to the DA 40 D TDI changed `name` and
  `variant` only.
- **`npm audit` reports a moderate advisory** in `esbuild`, reached through
  `drizzle-kit`. It affects a development server only, never the deployed app.
  The fix is a breaking downgrade of `drizzle-kit`, so it is being left until
  upstream updates.

### Gaps left open by Phase 2, in priority order

(Rate limiting on log in was the top item here and is now done — see the
conventions above.)

- **No password reset.** A user who forgets their password cannot get back in;
  their row has to be deleted by hand. Fixing it needs an email sender, which
  is a decision the owner has not been asked to make yet.
- **No email verification.** Anyone can sign up with an address they do not own.
  Harmless while accounts hold nothing; it matters once they hold progress.
- **Nothing sweeps the housekeeping tables.** `sweepExpiredSessions()` and
  `sweepLoginAttempts()` both exist and are correct, but nothing calls them.
  Expired rows are ignored when reading, so this is tidiness rather than
  correctness. A scheduled job can call them later.
- **The limiter does not stop a distributed attack.** Thousands of addresses
  each trying a few passwords from leaked credential lists would stay under
  both thresholds. Defending that needs rejecting known-breached passwords or a
  second factor — neither is needed at this size, but neither comes free with
  what is built here.
- **Practice does not require an account.** Deliberate: signing out must not
  take the question bank away. Signed-out tests are graded but recorded nowhere,
  and the result screen says so. Requiring a login to practise would be a
  one-line guard in the test page if the owner ever wants it — but it trades
  away everyone who wants to try the site before committing.
- **Attempts are written at the end of a test, not as each answer is given.**
  So an abandoned test records nothing, and a mid-test refresh still loses the
  answers. Recording per answer would fix both and is the natural Phase 5 change.
- **Signing in does not return you where you were.** `/progress` sends a signed-out
  visitor to `/login`, which then lands them on the home page. A `?next=` parameter
  would fix it, and must only ever accept a relative path or it becomes an open
  redirect.
- **The progress chart plots the last 100 tests and no more.** Fine now; a date
  filter is the honest answer once anyone exceeds that.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
