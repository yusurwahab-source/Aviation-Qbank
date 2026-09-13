# CLAUDE.md — Aviation Type Rating Question Bank

Working notes for this repository. Keep this file current: it is the agreed
description of how the project is built, not a historical record.

## What this is

A web application where student pilots practise multiple-choice questions for
aircraft type ratings. All user-facing content is in English.

**Current state: Phase 4 is complete, and Phase 5 is under way.** A user can
choose an aircraft, build a test from any combination of sections and any
number of questions, sit it either way — study, where each answer is marked
straight away with the correct option and the explanation and there is no
time limit, or exam, where nothing is shown until the end and the clock gives
one minute a question — and then see a result screen. Accounts exist,
and a signed-in user's answers are recorded as each one is given, which means
an abandoned test still counts and a mid-test refresh resumes rather than
restarts. Forgetting a password is recoverable: a one-time emailed link sets
a new one and signs every other device out. `/progress` reads that history
back: overall
score, performance by topic, progress over time, and the questions worth
retrying.

## The rule that shapes everything: many aircraft

The platform supports several aircraft types, each with its own question bank.
Two exist today — the DA40 and the B737 — and nothing in the code knows about
either.

Every table, route, query and report is keyed by aircraft code:

- `content/<code>/` — one folder per aircraft
- `aircraft` and `questions` tables — `questions.aircraft_code` on every row
- `/aircraft/[code]` and `/aircraft/[code]/test` — aircraft is part of the URL
- every query in `src/db/queries.ts` takes an aircraft code

**Adding an aircraft must stay a content-only job.** If a change would require
editing application code to add a second or third type, it is the wrong change.
This was first checked with a throwaway A320 folder; it is now settled by the
B737-800, which was added as `content/b737/` alone — a manifest and its question
files, one per FCOM chapter. No application code was touched, and the full test
suite passed against a database holding both banks.

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

**The answer key is never in the page, and never arrives before it is
earned.** This is the rule the whole test flow is built around, and it is
worth stating precisely, because in study mode the app shows a student the
right answer the moment they answer each question.

What has not changed: the page itself carries no answers. `pickTestQuestions`
and `getTestQuestionsByIds` — the two queries that put questions on screen —
select only the columns a student may see, and both are tested for it. No
amount of reading the page source, at any point in a test, yields a single
`correct` or `explanation`.

What the key does travel in is the reply to `answerQuestion`, one question at
a time, in response to that question actually being answered. There is no way
to read ahead with it: the only answer it will give you is for the question
you have just committed to, and for a signed-in student that commitment is
recorded *before* the answer comes back. Asking to see an answer therefore
costs you the attempt, which is exactly the trade a study tool should make.

Two things follow, and both are tested in a browser:

1. **A revealed question is settled.** Its options stop responding once the
   answer is on screen. This is not politeness — clicking through to the
   option you have just been shown would make every score, topic breakdown
   and retry list in the app a fiction. Verified by answering a whole test
   wrongly on purpose and then clicking the revealed answer on all 21 wrong
   questions: the score stayed 1/22.
2. **A resumed test comes back revealed, not reset.** Its already-answered
   questions get their keys sent with the page, because those were revealed
   once already and paid for; the questions still to come do not. In exam mode
   nothing has been revealed, so nothing is sent — verified by resuming an
   exam-mode test and checking the page for a key.

**A test is sat one of two ways, and the choice is a setting, not a
guard.** Study marks each question as it is answered and settles it; exam
holds everything to Finish and lets answers change on the way through. The
default is study — someone who has not chosen is practising, and practice is
better with the explanation in front of them.

`parseTestMode` reads it from `?mode=`, `answerQuestion` returns a verdict
only in study mode, and the runner locks only when it has one. Be honest
about what that does and does not achieve: a determined person could ask the
server for study-mode feedback during an exam-mode test. It would cost them
nothing they could not get by starting a study-mode test instead, and it is
their own practice they would be spoiling — so exam mode is written, and
commented, as a setting rather than an enforcement. If it ever needs to be
more than that (an instructor setting a real test, say), the mode has to move
onto the `test_sessions` row and be read from there rather than from the URL.

Either way the answer is still recorded as it is given, so the resume and
abandoned-test behaviour above is the same in both modes.

**The question map never says more than the mode allows.** The test screen
has a map behind the answered count: every question as a tile, coloured by
state, click one to jump to it, plus a shortcut to the next unanswered.

In study mode the tiles say which answers were right — the student was told at
the time, so it gives nothing away and makes a useful picture of how the test
is going. In exam mode they say only answered or not.

That rule is not enforced by a condition anyone could forget to write. It
falls out of where the information is: `questionStatus` reads `verdicts`,
which is *only ever populated in study mode*, so in exam mode there is no
branch that could leak correctness because the correctness is not there. It
lives in `src/lib/question-status.ts` rather than inside the component
precisely so it can be asserted directly, and it is — both in a unit test and
in the browser.

The map is collapsed by default and rendered only when opened: a test can be
the whole bank, and a thousand tiles is not something to keep mounted beside
a screen whose whole point is one question at a time.

**The clock belongs to exam mode, and it is not a setting.** Exam mode is
timed at **one minute a question**; study mode is untimed and shows a counter
that only counts up. Neither is chosen — both follow from the mode, through
`timeLimitFor(mode, questionCount)`.

That is the whole point of the change. A time limit the student picks is a
limit they can pick their way around, and a test builder with a clock in it
asks them to decide something they have no basis to decide. A minute a
question needs no explanation and no arithmetic: twenty questions is twenty
minutes. The Exam card in the builder states the figure for the test being
built, so the consequence is on screen before the choice is made.

Study mode's clock is a note, not a rule. It is rendered deliberately
quieter — muted rather than bold, and it never turns red — because nothing
hangs on it. There is no limit for it to reach.

There is consequently no `?minutes=` parameter and no `parseTimeLimit`. A
stale link carrying one is simply ignored, which is tested: `?minutes=99` on
a five-question exam still gives five minutes. This is a *reduction* in
untrusted input, not an unchecked one — the limit is now derived from a
question count the database already bounds.

**The clock itself lives in the database, not in the browser.**
`test_sessions` carries `startedAt` and `timeLimitSeconds`, written once when
the session is created and never moved. The deadline is derived from them
(`deadlineFrom`), never stored — two columns written together cannot
disagree, whereas a stored deadline could drift from the limit beside it with
no way to tell which was right.

`startedAt` is stamped for **every** session, timed or not. It used to be
null on an untimed test, which was fine when untimed meant "no clock at all";
now study mode shows elapsed time, and that has to survive a refresh rather
than restart at zero. Only `timeLimitSeconds` is optional, and only exam mode
has one.

This is what a refresh runs into, both ways round. Reload an exam and the
page re-reads the original `startedAt` and carries on counting down; reload a
study test and the stopwatch continues rather than resetting. There is no
path by which reloading hands out a fresh countdown. That matters for the
honest student who refreshes by accident at least as much as for anyone
trying it on purpose. Resume an exam whose deadline has passed and it does
not reopen — the clock reads zero, and it hands itself in.

A resumed test keeps the limit it *started* with, not one recomputed from
today's bank. The stored `timeLimitSeconds` is read back; nothing recalculates
it mid-test.

Both clocks tick against a fixed instant rather than in- or decrementing a
number, so a backgrounded tab or a sleeping laptop cannot slow either down:
the browser may miss a hundred ticks and the next one still shows the right
time. At zero the exam submits itself, once — `timeUpRef`, not state, so no
re-render can fire it twice.

Two edges worth knowing. A brand new test has no session until its first
answer, so between opening it and answering, the clock is the browser's own;
the first answer replaces it with the server's. And a signed-out student has
no session at all, so their clock is browser-only for the whole test — the
same trade as everything else they do signed out, and for the same reason.

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

The same has to hold on the way back in: `submitTest` and `answerQuestion` accept
up to `MAX_ANSWERS` (5000) questions, not the 50 the submission schema was
still capped at when this was first built. That leftover cap was dormant only
because no aircraft's bank had grown past 50 yet — it would have rejected the
grading of any "all questions" test on a bank bigger than that, silently
turning a correct test into a "could not be marked" error. `MAX_ANSWERS` bounds
a hostile payload the same way `parseTopics` bounds section names; it is not a
product limit.

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

**Every answer is saved the moment it is given, not only at Finish.** `topic`
and `aircraftCode` are stored on each `attempts` row rather than read through a
join, and there is deliberately **no foreign key to `questions`**.

The reason is concrete: `db:seed` deletes questions whose content files are
gone. A foreign key would either erase a pilot's history (cascade) or fail the
deploy (restrict). Neither is acceptable — editing content must never rewrite
the past, and the past must never block an edit. This was verified by deleting a
question, re-seeding, and confirming the attempt row and the topic report
survived intact. Reports join to `questions` only when they need current
wording, and skip questions that no longer exist.

A row is mutable, but only while its test session is in progress: going back
and changing an answer before Finish upserts the same `(testSessionId,
questionId)` row rather than adding a second one. Once the session's
`completedAt` is set, the row is frozen — nothing writes to it again. That
frozen state is what "append-only" now means: a *finished* test's history is
never silently rewritten; an active one can change, and only because the
student can too, by going back a question.

**A test is named by `?t=` in its own URL, not by state hidden in the
browser.** `test/page.tsx` redirects once to add a freshly minted id if the URL
doesn't have one, and that id is what every answer is saved under
(`answerQuestion` in `actions.ts`, on every selection) and what
Finish completes (`recordTestResult` in `db/attempts.ts`). Because the id lives
in the URL, a mid-test refresh carries the same one — the test page looks it
up (`findSession`), finds a session still in progress, and reloads the exact
same questions by id instead of drawing a new random set, pre-filling whatever
was already answered. Landing on it a second time after the test is
*finished* does not resume it: reusing a spent id would collide with that
session's row under the unique index below and silently swallow every new
answer, so the page mints a new one and redirects again, exactly as if the
test had never been visited before. This only applies to a signed-in student;
signed out, there is nothing to save, so every visit is simply a fresh test.

**One test can never be recorded twice.** A unique index on
`(user_id, client_test_id)` turns a double-click on Finish, or a retried
submission, into a no-op — the second call finds the session already
completed and returns without writing again. The session row and every
attempt for it are still made consistent in a single transaction each time
something writes to them, so a half-written test can never exist, whether that
write is one answer during the test or the full sweep at Finish.

**A failed save is never dressed up as a success.** If recording fails, the user
still sees their score, and the screen says plainly that it was not saved.
Someone revising for a type rating will decide what to study from a history they
believe is complete. A per-answer save failing mid-test is not shown at all —
there is nothing actionable for the student to do about it, and Finish's own
sweep re-sends every answer regardless of what did or didn't land earlier.

**Log in is rate limited, and the check runs before the password is verified.**
Verification costs half a second of CPU and 128 MB by design, so checking first
is what stops a flood of guesses exhausting the server — the limit protects the
machine as much as the accounts. Measured: a blocked attempt costs ~50ms against
~774ms for one that proceeds.

Three properties hold, and any change must keep all three:

1. **Nothing is ever locked permanently.** Both rules expire on their own.
   This used to be load-bearing in the strongest sense: before password reset
   existed, a permanent lock was unrecoverable without deleting the user's
   row by hand. There is now a second way out — a reset clears the address's
   failures, so somebody locked out by their own guessing can recover through
   their inbox — but the rule stands on its own merits, since a lock that
   needed an email to lift would fail anyone whose mail is not working.
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

**A forgotten password is recoverable, by a link that is a one-time key.**
`/forgot-password` emails a link; `/reset-password` spends it. The token is
256 bits of randomness and **only its SHA-256 is stored**, in
`password_reset_tokens` — the same design as session cookies, and for the
same reason: reading the table tells you a reset was asked for and gives you
nothing you could use.

Five properties hold, and every one of them is asserted:

1. **The request form never reveals who is registered.** Identical wording
   for a real address and an unknown one, and — through
   `withMinimumDuration` — identical timing. Sending mail costs a few hundred
   milliseconds while finding no account costs almost nothing, so without the
   floor the form would be a way to test a list of addresses. There is
   deliberately no "no account with that email" branch in
   `requestPasswordReset` to find. Measured in a browser: 0.3% apart.
2. **A link works once.** `usedAt` is set inside the update's own `where`
   clause (`usedAt is null`), so two submissions racing cannot both win — a
   check followed by an update would let them. An *expired* link is claimed
   by the attempt too, so retrying it cannot produce a different answer.
3. **Only the newest link works.** Issuing one deletes the user's outstanding
   links, so an older email is already dead and an account never has more
   than one live key.
4. **Using a link signs out every other session.** This is what makes a reset
   a security measure rather than a convenience: changing the password while
   leaving a thief's session alive would achieve nothing.
5. **Opening the link does not spend it.** Arriving at the page looks the
   token up but never marks it used — mail clients prefetch links, and a
   reload must not be fatal. Only submitting the form spends it.

Two smaller decisions worth keeping. The hour is checked *before* the new
password is hashed, because hashing costs half a second and 128 MB and an
invented token must not be able to buy that — the same reasoning as checking
the rate limit before verifying a log in. And a successful reset clears the
address's failed log ins: someone who has forgotten their password has very
likely just hit the limit guessing it, and handing them a working password
they are then refused would be absurd.

The honest limit: a *send* that runs over the response floor is still
distinguishable from one that never happened. That is a far smaller signal
than the raw difference, and closing it entirely would mean queueing mail in
a table of its own, which is not worth it at this size.

**Reset requests are rate limited too, and the limit is about mail, not
guessing.** Three an hour per address, fifteen per source. There is no
failure to count here — every request naming a real account sends an email —
so what the limit protects is somebody else's inbox, and this site's ability
to be pointed at it. Counted on the submitted address whether or not an
account exists, for exactly the same reason log in is.

The counters share the `login_attempts` table under their own key prefixes
(`reset-email:`, `reset-ip:`) rather than getting a table of their own, but
deliberately *not* the same keys: sharing them would let failed log ins use
up somebody's ability to ask for a reset, locking them out of the one route
back in. `sweepLoginAttempts` now takes the longest window of every rule, or
it would delete reset rows the limiter still needs.

**Email has one interface and no dependency.** `sendEmail` in
`src/lib/email/send.ts` posts to Resend with `fetch` when `RESEND_API_KEY`
and `EMAIL_FROM` are set, and otherwise prints the whole message — link
included — to the server log. The log route is not a stub that silently does
nothing: it means a fresh clone has a working password reset with no account
to open and no keys to obtain, and the request screen says plainly that this
is what is happening. Changing provider is this one file. `sendEmail` never
throws, because whether the mail went out must not change what the user is
told.

**Every report query takes a `userId` and filters on it.** A report is somebody's
private study history; a missing user filter would show it to the wrong person.
Tests assert this directly by giving two accounts different histories and
checking neither can see the other's.

**The retry list is "most recent answer was wrong", not "ever got wrong".** A
question you have since answered correctly is not worth drilling again, and a
list that never shrinks is one nobody uses. It joins to `questions`, so anything
deleted from content drops out of the list while still counting in the totals —
verified by deleting a question and checking both halves of that behaviour.

**An abandoned test still counts — for the answers it has, not as a test.**
`getSummary`'s answered/correct counts, `getTopicPerformance` and the retry
list all read straight from `attempts`, so a question answered in a test that
was never finished shows up immediately, exactly as if it had been. `testsTaken`
and `getProgressOverTime`, the two queries that read `testSessions` directly,
filter on `completedAt is not null`: an in-progress session has no score to
plot and is not yet a "test taken". The moment Finish sets `completedAt`, the
same session starts counting there too — verified directly, including the
transition from zero to one.

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
    password-reset.ts         Issuing and spending reset links
    index.ts                  Connection pool
  lib/
    email/
      send.ts                 sendEmail: Resend, or the server log
      reset-email.ts          The reset message (pure, tested)
    grading.ts                Scoring (pure, tested)
    question-status.ts        What the question map may say (pure, tested)
    password.ts               scrypt hashing (pure, tested)
    test-options.ts           Test length, sections, mode, the clock, and test URLs
    auth/
      credentials.ts          Email and password rules (pure, tested)
      rate-limit-policy.ts    When to refuse a log in or a reset (pure, tested)
      reset-policy.ts         Reset link lifetime and state (pure, tested)
      client-ip.ts            The caller's address, behind Vercel's proxy
      session.ts              Cookie and session table handling
tests/                        Vitest unit tests
```

## Build order

1. **Phase 1 — the core loop. Done.** Pick an aircraft, answer questions one by
   one, see a result screen. No accounts.
2. **Phase 2 — accounts. Done.** Sign up, log in, log out, and — added
   later, alongside Phase 5 — a password reset by emailed one-time link.
3. **Phase 3 — attempt recording. Done.** Every answer persisted: user,
   question, aircraft, selected option, correct or not, timestamp, test session.
4. **Phase 4 — reports. Done.** Overall score, performance by topic (the most
   important view), progress over time, retry incorrect questions. Scoped per
   aircraft (`/progress/[code]`) and overall (`/progress`).
5. **Phase 5 — refinement.** Done so far: the test builder (any sections, any
   number of questions); per-answer recording — a signed-in student's answers
   save as they are given, so a refresh resumes the same test and an abandoned
   one still counts; and immediate feedback — the correct answer and the
   explanation appear under each question as soon as it is answered, and that
   question then settles — with an exam mode beside it that holds everything to
   the end; a clock that belongs to the mode rather than to a setting — a
   minute a question in exam mode, a count-up note in study — held on the
   session row, so a reload cannot reset it and running out hands the test in;
   and a question map for jumping between questions mid-test. Still to do: filter by difficulty —
   the one item of the original Phase 5 list not built, and deliberately so,
   the owner having set it aside.

Do not start a phase until the previous one works.

## Not in scope yet

Payments, subscriptions, an admin panel, images in questions, mobile apps. The
data model must not make these harder later, but none of them get built now.

(Exam simulation was on this list until the owner asked for it. What exists
now is a mode that withholds the answers until the end, and a clock that is
held on the session row and cannot be reset by reloading. What is still not
built is an *invigilated* exam — one where the mode itself is enforced rather
than chosen, which would mean moving `mode` onto the session row too, the way
the clock already is. See the conventions above.)

Questions are authored as repository files. If questions ever need to be written
from inside the website, an admin panel gets added then — the `status`,
`version` and `media` fields exist so that path stays open.

## Known gaps, honestly

- **A mid-test page refresh restarts the test — for a signed-out visitor.**
  Nothing is recorded for them, so there is nothing to resume from; a refresh
  simply draws a fresh random set, same as visiting the test page for the
  first time. A signed-in student does not have this problem any more — see
  the note on `answerQuestion` and `?t=` in the conventions above.
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

  The 737 bank is the one exception, and it proves the rule rather than
  softening it. It shipped as `B738` and was changed to `B737` at the owner's
  request within hours, while the bank was one section old, nothing linked to
  it and nobody had answered a question in it — so the rename cost two files
  and 52 ids and orphaned no history. That window is now closed. `B737` is
  published, and the next such request is a migration (rewriting
  `attempts.aircraft_code` and every stored question id), not an edit.

  Worth knowing if a second 737 variant is ever added: `B737` is the ICAO type
  designator for the **-700**, and `B738` for the -800 this bank actually
  covers. The code here names the *type rating*, which is the 737 family, so
  `B737` is right for what the app is for — but the obvious code for a -700
  bank is taken, and it would need a different one.
- **`npm audit` reports a moderate advisory** in `esbuild`, reached through
  `drizzle-kit`. It affects a development server only, never the deployed app.
  The fix is a breaking downgrade of `drizzle-kit`, so it is being left until
  upstream updates.

### Gaps left open by Phase 2, in priority order

(Rate limiting on log in was the top item here, and password reset the
second. Both are now done — see the conventions above.)

- **The deployed site needs a mail provider before password reset is any use
  there.** Without `RESEND_API_KEY` and `EMAIL_FROM` the link goes to the
  server log, which nobody but the owner can read. Locally that is the point;
  in production it means the feature is present but unusable. See
  `.env.example`.

- **No email verification.** Anyone can sign up with an address they do not own.
  Harmless while accounts hold nothing; it matters once they hold progress.
- **Nothing sweeps the housekeeping tables.** `sweepExpiredSessions()`,
  `sweepLoginAttempts()` and `sweepExpiredResetTokens()` all exist and are
  correct, but nothing calls them.
  Expired rows are ignored when reading, so this is tidiness rather than
  correctness. A scheduled job can call them later.
- **No "your password was changed" email.** A reset tells the account's owner
  nothing after the fact, so somebody who took over an inbox leaves no trace
  in the other one. Worth adding now that there is a sender to add it with.
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
