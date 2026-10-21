# CLAUDE.md — Aviation Type Rating Question Bank

Working notes for this repository. Keep this file current: it is the agreed
description of how the project is built, not a historical record.

## What this is

A web application where student pilots practise multiple-choice questions.
All user-facing content is in English.

**The product is three sections, not one bank, and the goal is understanding
the aircraft, not memorising questions.** Every wrong option has to be ruled
out by knowing the system, not recognised by its shape — a question that can
only be got right by having seen that exact question before is a bug, not
content. `/type-rating` is **Type Rating Systems Knowledge** — large
aircraft, sat the way a type rating is — the B737 today. `/class-rating` is
**Class Rating Systems Knowledge** — light aircraft, the same way — the DA40
today, with no "single engine" or "multi engine" split between it and the
section; a light aircraft sits directly under Class Rating. `/flying-knowledge`
is **Flying Knowledge** — general theory that is not tied to any aircraft —
air law, meteorology, navigation, the material a pilot keeps reviewing
rather than sits once. It has three subjects now, **Principles of Flight
(POF)**, **Human Performance & Limitations (HPL)** and **Meteorology
(MET)**; further
subjects are added the same content-only way a second aircraft is (see the
note on Flying Knowledge's own content tree below), and the page title
stays "Choose a subject" rather than naming just one. (IFR and FI(A)
Course Theory — F AIR were here earlier and were removed at the owner's
request, content and import tooling both.) It is free
in full, never behind the free-tier cap or a subscription — decided ahead
of any content, and unchanged now that content exists: nothing in
`flying-knowledge/[code]/test/actions.ts` ever calls `db/subscriptions.ts`
or `db/preview.ts`. The landing page's hero
asks which of the three a visitor is here for rather than leading with one
aircraft; see the note on the three sections in the conventions below.
The landing page and header present the four sections as three pillars
(ATPL Ground School, Aircraft Systems, Pilot Sims) — see the note on
pillars below.

Both picker pages — `/type-rating` and `/class-rating` — title themselves
**"Choose an aircraft,"** not "Choose a type rating" or "Choose a class
rating": the section name already says which kind of rating this is (it is
the page's `eyebrow`), and what the page actually asks the student to do is
pick an aircraft.

**Current state: Phase 6 (payments) is complete.**
A user can choose an aircraft, build a test from any combination of sections
and any number of questions, sit it either way — study, where each answer is
marked straight away with the correct option and the explanation and there is
no time limit, or exam, where nothing is shown until the end and the clock
gives one minute a question — and then see a result screen naming a
pass/fail verdict, the time taken, a per-system breakdown and the two
weakest systems, with exactly three ways onward: retake what was got wrong,
a new test on the weakest systems, or back to the dashboard. A signed-in
student can flag any question and keep a private note on it, both
autosaving with no explicit save step; a test builder preset turns either
into an instant test, alongside "my weakest systems" and "questions I have
never seen". Accounts exist,
and a signed-in user's answers are recorded as each one is given, which means
an abandoned test still counts and a mid-test refresh — or a return visit
days later, surfaced by a "Resume your test" banner on the type rating or
class rating overview page and the dashboard — resumes rather than
restarts. Forgetting a password is
recoverable: a one-time emailed link sets
a new one and signs every other device out. `/progress` reads that history
back: overall
score, performance by topic, progress over time, and the questions worth
retrying.

A signed-in student may answer up to a fixed number of questions free on
each aircraft; going further needs a subscription, bought at `/upgrade`
through Stripe Checkout and confirmed by its webhook. Verified end to end
against a real Stripe account in test mode. See the note on payments in the
conventions below and in "Not in scope yet".

The product is called **PilotQBank**, and it has an identity to match: a
dark flight-deck palette with a light theme beside it, two typefaces, a
logo mark, and an application shell — header, navigation, theme toggle,
account menu, footer — that works down to 375px. Everything visual is
driven by tokens in one file; see the conventions below.

(This was first built against 2Checkout. That merchant application was
declined before a single test payment could be attempted, so the
integration was rebuilt against Stripe instead — the free-tier rule, the
database and the gating in `answerQuestion` did not need to change, only
the checkout link and the webhook.)

## The rule that shapes everything: many aircraft, in two trees

The platform supports several aircraft, each with its own question bank, and
each sits in one of two genuinely separate content trees — type rating or
class rating — rather than one table with a "kind" column. Five aircraft
exist today: the B737 and the A320 family, type ratings, and the DA40, C152 and DA42 (a light
twin, sitting under Class Rating with the other light aircraft precisely
because the class/type split is about aircraft size, not engine count — see
"there is no 'single engine' or 'multi engine' split" above), all three
class ratings. Nothing in the code knows about any aircraft specifically,
and nothing outside
`db:seed`'s own sync knows that a table pair is "for" one tree rather than
the other — see the note on `classRatings` in `db/schema.ts` for why the
split runs all the way down rather than being folded into one.

Every table, route, query and report in each tree is keyed by that tree's
own aircraft code:

- `content/<code>/` — one folder per **type rating** aircraft; `content/classes/<code>/`
  — one folder per **class rating** aircraft
- `aircraft` and `questions` tables (type rating) — `questions.aircraft_code` on
  every row; `class_ratings` and `class_questions` tables (class rating) —
  `class_questions.class_code` on every row
- `/type-rating/[code]` and `/type-rating/[code]/test` — a type rating aircraft
  is part of the URL; `/class-rating/[code]` and `/class-rating/[code]/test` the
  same for a class rating one
- every query in `src/db/queries.ts` takes a type rating aircraft code; every
  query in `src/db/class-queries.ts` takes a class rating one

Everything downstream of a question id — `attempts`, `question_flags`,
`question_notes`, `subscriptions` (the free tier), `preview_attempts` and
`lib/grading.ts` — is shared unchanged between the two trees, because none
of it joins to `questions` or `aircraft`; see the note on `attempts` in the
conventions below for why that join was never there to begin with. This is
what let the DA40 move from the type rating tree to the class rating tree
in a single content-and-tests change with no schema migration: the tables
it needed already existed, sized for exactly this.

**Adding an aircraft, to either tree, must stay a content-only job.** If a
change would require editing application code to add a second or third type
rating, or a second class rating, it is the wrong change. This was first
checked with a throwaway A320 folder; it is now settled by the B737-800,
which was added as `content/b737/` alone — a manifest and its question
files, one per FCOM chapter. No application code was touched, and the full
test suite passed against a database holding both banks.

**Pilot Sims is a fourth section that is not a question bank.** `/pilot-sims`
lists interactive simulators; today there is one, the Holding Pattern Entry
Trainer. A simulator is a complete standalone page in `public/pilot-sims/`
(its own JS and CSS, Google Fonts the only outside dependency), shown at
`/pilot-sims/<slug>` inside an iframe with `sandbox="allow-scripts"` and no
other permission. **Its internals are not edited from this repository** — the
entry-sector rules and SVG geometry were checked against FAA/ICAO sources as
supplied, so a change there is a new file from the owner, not a patch. (The
holding trainer's layout, its HSI touch control — now the VOR/NDB trainer's
turn-anywhere drag — and its reveal of the correct entry were changed here at
the owner's explicit request; its entry rules and grading were not.) The
list is a constant in `src/app/pilot-sims/sims.ts`: no database, no content
tree, no free-tier or subscription involvement, free for everyone. Adding a
simulator is its file in `public/pilot-sims/`, an entry in `sims.ts` and a
page beside the existing one. The service worker already leaves `.html`
alone. It is in the header's links and in `sitemap.xml`.

**Logbook Scanner (`/tools/logbook`) is a tool, not a question bank.** A
student photographs their paper EASA logbook, one two-page spread per photo,
and gets a verified e-logbook back. It is linked from the Pilot Sims page's
"Tools" list, not the header (the header's row is full; see below). Four
parts, kept apart on purpose:

1. **Extraction** — `api/logbook/extract/route.ts` sends one photo to the
   Anthropic Messages API (`@anthropic-ai/sdk`, the one SDK installed here,
   because the Claude API guidance is to use the official SDK rather than
   `fetch`). The key (`ANTHROPIC_API_KEY`) and model (`LOGBOOK_MODEL`,
   default `claude-sonnet-5-5`) are read on the server only. The model is
   told to **transcribe, never correct**, and every cell comes back as the
   text written on the page; `lib/logbook/extraction.ts` turns it into
   minutes. The reply is held to a JSON schema by the API (structured
   outputs) and checked again with the same Zod schema plus format rules;
   a bad reply is retried once with its problems named
   (`lib/logbook/claude.ts`, tested with a stand-in client). Anything that
   still will not parse becomes a low-confidence blank, not an error page.
2. **Validation** — `lib/logbook/validate.ts`, deterministic, pure, no AI.
   Every time is whole minutes; struck-through rows count for nothing. It
   checks page sums, carry-forward, running totals, the PIC/co-pilot/dual/
   instructor split per row and per page, block time (±5 min), arrival
   before departure (a flight past midnight is info, not an error), flights
   with no function time, a flight missing from the page sum, missing
   data, date order and low-confidence readings; then recomputes a
   corrected running total for every page. An instructor logging the same
   flight as PIC *and* instructor is accepted, not flagged as double
   counting. A finding's `key` excludes the page index, so "Ignore"
   survives the student reordering pages.
3. **Review and results** — all in the browser
   (`tools/logbook/[logbookId]/`): editable table per page, every edit
   re-running the whole validation; totals dashboard and the paper fix
   guide (`lib/logbook/summary.ts`); CSV, XLSX, JSON and an EASA-layout PDF
   (`lib/logbook/export/`), each carrying the disclaimer. XLSX and PDF are
   written by hand (a stored zip; Helvetica and lines), so no library ships
   to the browser for a download button.
4. **Access** — `logbook_extractions` is the meter: two free spreads per
   account, then a logbook needs an unlock (one credit, 40 spreads). A
   spread is reserved as a `pending` row under a per-user advisory lock
   *before* the model is called, so racing uploads cannot share the last
   one; a failed call does not count. Credits (`logbook_credits`) come from
   a license code whose `grants` is `logbook`, a manual grant at
   `/owner/logbook`, or — once — an active subscription (a partial unique
   index stops it being taken twice). `LOGBOOK_PURCHASES_ENABLED` is the
   feature flag for the €4.99 price; **no payment provider is connected**,
   and `grantLogbookCredits(source: "purchase")` is the hook one will call.
   Uploads are rate limited (`logbookPerUser`, 60 an hour) and capped at
   10 MB; the browser scales photos to 2000px JPEG first, which also
   converts HEIC where the browser can decode it.

**Photos are never stored.** The image exists in the request's memory and
the API call, nothing else; the review screen's copy is an object URL in
the tab. Extracted entries reach the database only on "Save to my account"
(`logbooks.data`), and "Delete all my logbook data" deletes those rows. The
meter rows hold token counts, not content, and deliberately survive that
delete — otherwise deleting would hand the free spreads back. Token counts
and cost per request are visible only at `/owner/logbook`.

**The Instagram agent posts once a day, from Flying Knowledge alone.**
`vercel.json` calls `api/cron/instagram/route.ts` daily; it is not a chatbot
but a scheduled job with a fixed rhythm (`lib/instagram/plan.ts`, pure and
tested): Monday, Wednesday and Friday a **question** as a two-slide carousel
(the question, then its solution), Tuesday and Saturday a **revision card**
from a question's explanation, Thursday and Sunday a **promo** from a
hand-written list that states no counts. Cards are drawn by
`api/instagram/card` with `next/og` at 1080×1350. **Only `flying_knowledge_*`
is ever read** — it is the one bank free in full, and nothing paid may reach
a public feed. Because Instagram must fetch each image from a public URL, the
card route is signed (`lib/instagram/signature.ts`, HMAC with `CRON_SECRET`);
unsigned or unknown is a 404, so it cannot be used to read answers without
sitting a test. `instagram_posts` claims the UTC day as `pending` *before*
Instagram is called (unique on the day, like `logbook_extractions`), so a
double cron cannot post twice; only a `failed` row is retried, and a stuck
`pending` is left alone because the post may be live. A question is never
reused (`content_ref`), and one that does not fit a card is skipped, not
shortened. It is a **dry run** — it returns the caption and image URLs and
touches nothing — until `INSTAGRAM_POSTING_ENABLED=true`; `?preview=1` forces
a dry run after that. Publishing is the Graph API (`lib/instagram/graph.ts`,
`fetch` injected, no SDK) with a long-lived Page token for a Business or
Creator account linked to a Facebook Page. The route answers 404 without
`Authorization: Bearer $CRON_SECRET`.

**Old links still work.** `/aircraft` and `/aircraft/[code]` (and its
`/test` page) were the type rating routes before this split existed;
`/class` and `/class/[code]` were an earlier name for the class rating
ones; `/aviation-knowledge` was Flying Knowledge's own name for one
deploy. All five now live under `src/app/aircraft/`, `src/app/class/` and
`src/app/aviation-knowledge/` as pure redirects — `/aircraft/[code]` looks
the code up in both trees (a type rating aircraft can move to the class
rating tree, as the DA40 did, so the code alone no longer says which one a
stale link meant) and forwards to whichever one has it, carrying every
query parameter across. `proxy.ts`'s matcher only covers the new
`/type-rating/:path*` and `/class-rating/:path*` prefixes — the legacy
routes mint nothing themselves, so the *second* request a redirect causes
is the one that needs the preview cookie.

**`sitemap.xml` and `robots.txt` are generated, not written by hand, so
they can never drift from what the database actually holds.**
`src/app/sitemap.ts` lists the home page, the three section pickers, the
short footer pages, and — from the same `listAircraft`, `listClassRatings`
and `listFlyingKnowledgeSubjects` the landing page already reads — one URL
per aircraft, class rating and Flying Knowledge subject whose `status` is
`active`. A `coming_soon` row never gets a URL, the sitemap's own version
of "only `published` questions are ever shown to a user": there is no test
to sit and nothing but a placeholder behind it, so sending Google there
would be indexing a dead end. The URL-building itself is pure and unit
tested (`lib/seo/sitemap-entries.ts`), the same split every other decision
in this file keeps between a pure rule and the database read that feeds
it; the codes it uses are exactly what the database stores (`B737`,
`DA40`), uppercase, because that is the same string every in-app link to
that page already uses — a lowercased URL would still resolve, since the
lookup is case-insensitive, but it would be a second, unlinked address for
the same page, which is precisely the duplicate-URL confusion a sitemap
exists to prevent.

`src/app/robots.ts` points at it and disallows the handful of pages
deliberately left off it: the legacy redirects from the note above
(`/class$` and `/class/` rather than a bare `/class`, so the disallow
does not also swallow `/class-rating`, which starts with the same four
letters), `/owner` and `/api/`, and every page that either requires an
account or exists only to send a signed-out visitor to one — sign-in,
sign-up, `/upgrade`, `/redeem`, `/progress`. None of this is a security
boundary; `/owner` was already unreachable to anyone but the owner before
this file existed. It is only about crawl budget and not indexing a page
with nothing on it for a stranger.

Both share `lib/canonical-url.ts` — the same "explicit `APP_URL`, then
Vercel's production domain, then localhost, but never localhost in
production" resolution `layout.tsx`'s own canonical tag already used
before this, now pulled out so the canonical tag, the sitemap and
robots.txt can never name three different addresses for the same
deployment. Neither route takes a `dynamic` export: both read the
database, but a build already runs against the freshly seeded content
(`vercel-build`, above), so generating them once at build time is the same
trade every other page here makes, and it means a deploy — not a crawl —
is what updates them.

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
| `npm run icons:generate` | Redraws the favicon, the app icons and the manifest icons from the logo mark. Outputs are committed; run it only when the mark or the brand colours change. |
| `npm run gift:generate -- --count <n> --days <n> --plan <monthly\|quarterly> [--note "..."]` | Mints free-access gift codes and prints them. |
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
- **Tailwind CSS v4** — styling in the markup, every token in
  `src/app/globals.css`.
- **Vercel** for deployment.

One deviation, to remove a dependency rather than add one:

- **Zod for content validation.** Needed anyway to make the build fail loudly on
  bad question files, so it is also used to validate the server action input.

**Two web fonts, self-hosted by `next/font`** (`src/app/fonts.ts`). This
reverses an earlier decision to use the system stack: that was the right
trade while the application had no visual identity to carry, and the wrong
one once it did. The build now depends on Google Fonts at build time, which
is the cost.

Space Grotesk is the interface. Inter is what question text is set in, and
that is the decision that actually matters here — a student reads far more
question text than interface, for hours at a time, so the reading face was
chosen for letterforms that stay distinct from one another when tired, not
for how it looks in a heading.

## Conventions

**Every colour, size, radius and shadow is a token in
`src/app/globals.css`, and nothing in `src/` names one directly.**
Components use Tailwind utilities — `bg-surface`, `text-brand`,
`rounded-lg` — which resolve through the `@theme inline` block to the
custom properties defined at the top of that file. Changing how the whole
application looks is an edit to one file. There is not a single hardcoded
palette colour anywhere in `src/`, and adding one would be the wrong
change.

The palette is **Aviation Classic**: Deep Navy (`#1A2536`) behind, panels
lifted out of it in steps rather than by shadow, pure white text, and one
accent, Aviation Yellow (`#FBC02D`). Light theme is `#F8F9FA` with carbon
`#212529` text. Yellow is for the thing to do next (primary buttons), where
you are (the active header link) and how far along you are (progress);
it is never right or wrong. Semantic colour is kept pure and separate from
that accent — success, danger, warning and flag each mean exactly one
thing, and the warning is orange rather than amber so it cannot be read as
the accent — so "this is important" and "this is correct" can never be
confused with each other.

**Yellow is a fill, not a text colour, on a pale surface.** `#FBC02D` on
white is 1.7:1. `--accent` is the fill (navy `--on-solid` text on it, 9.3:1
in both themes); `--accent-ink` — `text-brand-ink` — is the same hue for
text, lines and chart marks, and deepens to `#7A5400` in light. Anything
that is text or a stroke uses the ink, anything that is a fill uses
`bg-brand`. `--on-danger` is the one on-fill token that still flips with
the theme. `manifest.ts`, `layout.tsx`'s `themeColor`, the social card and
the icon cannot read CSS variables, so they carry the same hex values by
hand — change them with the palette.

The scales are deliberately short: seven type sizes (12/14/16/18/24/32/40),
four radii, two shadow levels. Spacing rides on Tailwind's own 4px step
rather than a second scale to keep in sync with the first.

`--brand`, `--correct` and `--incorrect` survive as aliases of `--accent`,
`--success` and `--danger`. A hundred class names in `src/` still use the
older spelling; one vocabulary with two spellings is a smaller problem
than a rename touching every component, and that rename can happen on its
own when it is worth the diff.

**Dark is the default; light is a real second theme, and the student's
choice always beats the operating system's.** Light is applied by
`prefers-color-scheme` only on a root with no `data-theme` attribute, so
the toggle's explicit value can never be overridden — the two selectors
cannot match the same element, which is a stronger guarantee than
specificity. The toggle writes to `localStorage` inside `try`/`catch`,
because that API throws outright in a locked-down browser and somebody who
cannot save a preference must still be able to use the button.

A blocking inline script in `ThemeScript` applies the stored choice before
the first paint. It has to be blocking and it has to be inline: anything
waiting for React runs after the browser has already painted the wrong
theme.

**Every fill flips brightness with the theme, which is what `--on-solid`
is for.** Dark uses bright accents with dark text on them; light uses deep
accents with white text. One token, one class name, legible in both — and
the reason no component says `text-white` any more.

**The product is named once, in `src/config/site.ts`.** Name, tagline,
description and URL. No component, page title or email hardcodes it. That
file is deliberately static data with no environment reads and no
`server-only` import, so both server and client components can use it;
anything needing the deployment's actual address calls `appUrl()`, which
already knows how to find it.

**Question text is set in a different face from the interface, and that is
the point.** `.question-text` — the reading face at 17px rising to 18px,
leaded at 1.6 — is applied to the question stem, the options and the
explanation. Everything else is the display face. A student reads far more
question text than interface, for hours, so this is the one typographic
decision in the product that is worth arguing about.

**Interactive targets are at least 44px, except where the exception is the
right answer.** `.tap-target` and `.link-standalone` carry that for
controls and for links that stand on their own line. A link inside a
sentence keeps the text's own height — WCAG's own exception, and
stretching one would break the line it sits in. A 16px radio inside a 52px
label is fine too: the label is the target.

Every route has been opened at 375px in Chromium and measured, for
horizontal overflow and for target sizes. `overflow-x: clip` on `html` is
a safety net, not the fix — overflows get solved where they happen.

**The landing page's job is to start a test, and the hero asks which
pillar rather than assuming.** `Hero` has no featured aircraft. Its one
primary action is `TryFreeButton` (`_landing/try-free-button.tsx`), a
yellow "Try free questions" link straight into a ten-question Flying
Knowledge test — chosen because that section is free in full, so there is
no preview allowance to run out of — computed in `page.tsx` as `tryHref`
and omitted when no active subject exists. Under it, `PillarLinks`
(`_landing/pillar-links.tsx`) is three identical outlined buttons — ATPL
Ground School, Aircraft Systems, Pilot Sims, the short names from
`pillarShortTitle` — for a visitor who already knows where they are going.
`FinalCta` repeats only the try button and a sign-up link. None of the
three pillars is ranked above the others. The header's desktop navigation
uses the same short names (the mobile sheet keeps the full ones), and its
sign-up button reads "Start free".

**The product is presented as three pillars, over four sections.** A
pillar (`lib/pillars.ts`, pure and tested) is only a grouping: **EASA ATPL
Ground School** is the Flying Knowledge section (`/atpl-ground-school`;
its default label in `lib/settings.ts` is now "EASA ATPL Ground School");
**Aircraft Systems Knowledge** (`/aircraft-systems`, a thin chooser) groups
`type-rating` and `class-rating`, which stay two separate trees, pickers and
sets of tables; **Pilot Sims & Flight Trainers** is `pilot-sims`.
`SectionKey`, `hiddenSections`, `hiddenItems` and `itemOverrides` are
unchanged. A pillar is hidden only when every section behind it is. The
header and the landing cards read pillars; everything else still reads
sections. A label the owner saved in `site_settings` still beats the new
default, so an old "Flying Knowledge" label stays until it is cleared at
`/owner/settings`.

**The ATPL Ground School page lists the fourteen EASA ATPL theory subjects
from a static list (`lib/atpl-subjects.ts`), not from the database.** A
subject with no questions has no content folder and no row (`db:seed` would
delete one), so "coming soon" rows cannot be database rows. A row is live
only when a Flying Knowledge subject is named by its `code` there (POF is
080, HPL is 040, MET is 050, RNAV is 062, LAW is 010, AGK is 021, OPS is 070, COM is 090, MB is 031, PERF is 032, INST is 022) and is active with published questions; live rows link to
`/flying-knowledge/<code>`, where tests still run, and carry a pulsing
`LiveBadge`. `/flying-knowledge` itself redirects to the picker. Adding a
subject to the ATPL list is a content folder plus its `code` in that list.

**Pilot Sims is meant to become a paid product, and nothing gates it yet.**
`PilotSim.tier` (`sims.ts`) is `"free"` for both sims and is display only:
the landing card says "Premium soon" and shows each sim's tier. Making a sim
premium needs an access check as well as the flag, and `/pricing` and the
upgrade dialog still say, truthfully, that Pilot Sims is free.

**The header's desktop navigation starts at `lg`, and the wordmark must not
shrink.** The wordmark is an `<img>` in a flex row; with the default
`flex-shrink` a crowded row squeezed it to a quarter of its width while its
height stayed fixed, so the letters drew tiny inside a box that still looked
the right size — for everybody, from the day it shipped, and nobody noticed
because a squeezed logo still looks like a logo. It is `shrink-0` now, 24px
tall (145px wide), and the nav links are `px-2.5`: measured at 1024, 1100 and
1280 with the owner's seven links, the row fits exactly. Below `lg` the
menu button replaces the nav, because the full-size wordmark plus six links
does not fit in `md`. The account menu shows an avatar only; the address is in
its dropdown.

Directly under the hero, `PillarsOverview` (`_landing/pillars-overview.tsx`)
is three cards of identical shape, one per pillar: a title, a line of
description, a short list of what is inside, and one way in. ATPL lists its
live subjects with a `LiveBadge` and counts the rest as coming soon;
Aircraft Systems lists Type Rating and Class Rating with their real
question counts and aircraft codes (`summariseSection`, from both trees,
never one featured aircraft); Pilot Sims lists its simulators. There is no
"single engine" / "multi engine" split anywhere: a light aircraft sits
directly under Class Rating.

The old systems strip is survived by one thing worth keeping if a
horizontally-scrolling row of cards is ever built again: `.scroll-x`
(`globals.css`) still carries `contain: paint`, because `overflow-x: auto`
on its own gives a box a scrollbar and *still* lets its overflow count
toward the document's scrollable width — measured directly, on that strip,
where fifteen cards made a 375px page report 3836px wide and the page
scrolled sideways. `html { overflow-x: clip }` would have hidden that; the
rule is that overflows get solved where they happen, and that is where it
happened. `.scroll-strip`, the snapping variant built on top of it, was
deleted along with the strip itself once nothing used it any more.

**The hero's artwork is a 737 planform, drawn, and placed by CSS rather
than cropped by a viewBox.** Still no photography, for the reason
`hero-background.tsx` has always given: there is none to license honestly
here, and a stock airliner would say nothing true about this product. It is
a planform because that is the shape a type is actually identified by — the
wing sweep, the engine position, the tailplane.

The placement is the part worth keeping. One `preserveAspectRatio="slice"`
viewBox was the obvious way and it fails on a phone: an 800×600 box sliced
into a 375×1200 hero scales to the height and shows the middle fifth of the
width, so both the aeroplane and the compass bezel fell outside the crop
entirely and most visitors saw an empty panel. Each layer now carries a
viewBox that just fits its own drawing and is positioned and sized by
Tailwind at each breakpoint, so the composition is *designed* at 375px
rather than merely surviving there.

**A fixed-position layer goes in a portal, not in place.** The mobile
sheet sits inside a `backdrop-blur` header, and a `backdrop-filter` makes
an element the containing block for every fixed descendant — so `inset-0`
resolved against the header, not the viewport, and the sheet was clipped
to its own title bar. It renders into `document.body` now. Anything else
fixed and full-screen should do the same.

**The service worker caches the app shell and static assets, and must
never cache a document.** Every page here is rendered per request and most
differ by who is signed in; a cached document would show one student's
header and allowance to the next person to open the app on that device.
`/api`, non-GET requests and question data are all excluded by design —
the answer key travels one question at a time in reply to an answer, and a
cache is exactly the wrong place for it. Anything the worker does not
match falls through to the network untouched, so the application is fully
functional with no worker at all.

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

**A signed-out visitor gets a preview, and it is counted on the server.**
This is the correction of a real hole, not a new feature, and it is worth
writing down plainly because the rule above — "the answer key is never in
the page, and never arrives before it is earned" — was true of the *page*
and false of everything else. Signed out, nothing was earned and nothing was
counted:

- `test/page.tsx` capped a freshly built test to the free allowance only
  inside `if (user)`, so `?questions=all` handed a visitor with no account
  every published question in the bank — 802 stems and options on the B737
  — in one response.
- `answerQuestion` returned the correct option and the explanation to a
  signed-out caller unconditionally, with no allowance to spend and no rate
  limit, one question per call.
- `submitTest` was worse, and was the one that mattered: it graded whatever
  question ids it was handed, up to `MAX_ANSWERS`, and returned the full key
  for all of them. **One anonymous POST naming every published question came
  back with every answer and every explanation.** No cookie, no account, no
  limit.

All three are closed the same way, by the allowance the rest of this file
already describes, counted against the only identity a signed-out visitor
has. `PREVIEW_QUESTIONS_SIGNED_OUT` (5, and an owner setting like the free
tier) is the limit; `preview_attempts` is the count, keyed by the SHA-256 of
a random token in an HTTP-only cookie — the same shape as `sessions`, so
reading the table gives nothing usable; `canAnswerQuestion` is the decision,
unchanged, called with a different limit. The test page sizes a signed-out
test to what is left of it, `answerQuestion` spends one slot per new
question, and `submitTest` grades the whole test — the score is the
student's own — but strips the key off anything outside the allowance
(`withholdAnswerKey`, pure and tested) rather than shortening the test.

Two things that fall out of this and should not be reversed casually. A
question already previewed is free to see again, which is what makes going
back through a preview test cost nothing. And the review still says "18 of
20" when two answers are withheld, because grading runs over the whole test
and the redaction happens afterwards — a student who left questions blank
must not be told they sat a shorter test than they did.

**The visitor cookie is minted by `src/proxy.ts`, not by the action, and
that is not tidiness.** `ensurePreviewVisitorId` can set it — it is a
server action, so it is allowed to — but **a server action that writes a
cookie makes Next re-render the page it was called from**, and a
signed-out test page has no session to resume, so re-rendering it draws a
fresh random set of questions. The effect was that the very first answer
of a visitor's very first test silently restarted that test and threw away
the answer they had just given. Found in a browser, not reasoned about.
Minting on the way *in* means the action never writes a cookie and nothing
re-renders. The action keeps its own minting as a fallback, so the proxy is
not load-bearing for the limit — delete it and the preview is still
enforced; the first test of a visit would just restart once.

It is `proxy.ts` because Next 16 deprecated the `middleware` file
convention and renamed it; the build says so if it is ever renamed back.
The matcher is `/type-rating/:path*` and `/class-rating/:path*` — the two
routes a test can actually be started or answered on — so nobody reading
the marketing pages is given a cookie, and a request already carrying a
session cookie is skipped entirely — a signed-in student is metered
against their account. The legacy `/aircraft/:path*` and `/class/:path*`
prefixes are deliberately excluded: both are pure redirects now (see the
note on old links in "The rule that shapes everything" above) that mint
nothing themselves, so the request that needs the cookie is the second
one, to the path it redirects to.

**And be honest about what the cookie is worth: nothing, against a script.**
It is the visitor's to delete, and a caller that never sends one back is a
new visitor on every request. So the cookie meters honest use, and
`RATE_LIMIT_RULES.previewPerIp` — forty signed-out answers per address per
fifteen minutes, counted per *request* like reset requests rather than per
failure — is the limit that actually holds. Both are needed: the rate limit
alone would let one patient visitor read everything, and the cookie alone
would stop nobody. Neither turns this into a wall; see "Known gaps".

The whole of this applies to signed-out callers and to signed-in ones past
their free allowance alike — `entitledAnswerKeyIds` in `actions.ts` asks the
same question of both, because "grade anything, return everything" was
`submitTest`'s behaviour for a free account too.

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

**A flag and a note are the student's own, not part of the question.**
`question_flags` (one row per `(userId, questionId)`, toggled) and
`question_notes` (one row per `(userId, questionId)`, upserted) sit beside
`attempts` rather than inside it — a flag or a note can exist on a question
never answered, and answering again must not disturb either. Both are
scoped to `aircraftCode` the same way every other per-student table is, and
both are signed-in-only: `FlagButton` and `QuestionNote` are simply not
rendered to a signed-out visitor, the same degradation the rest of this
file already applies to history and reports.

`FlagButton` takes no state of its own — `flagged` and `onToggle` come from
the runner and the result screen alike, so the same `Set` of flagged ids
backs both without two components drifting out of sync. The toggle is
optimistic: the runner flips its local `Set` before `toggleFlag` returns
and reverts only if the server call fails, so flagging never waits on the
network — the one thing the task that added it insisted on.

`QuestionNote` autosaves, debounced 800ms after the last keystroke, and
there is nothing to submit: closing the editor cannot lose a change, because
the debounce fires well before a student would think to close it, and a
pending save survives the student moving to the next question because its
timer is not torn down with the component that started it. The body is not
fetched until the editor is actually opened (`onLoad`), because preloading a
note for every question in a test that might be the whole bank does not
scale — only the fact that a note *exists* (`hasNote`, for the button's own
marker) is known up front.

**The `N` shortcut has to force the note open even when it is already
open.** A `forceOpenToken`, bumped once per press, is what `QuestionNote`
watches rather than a plain "open" boolean — a boolean set to `true` a
second time is not a new value, so nothing downstream re-fires from it, and
a student who has since clicked elsewhere and lost focus would find `N`
doing nothing. Comparing the incoming token against a mirrored
`openedForToken` state **during render** — not inside a `useEffect` — is
what a fresh instance needs too: this component remounts per question (it
is keyed by question id), and an effect-based check would still paint the
previous question's open panel for one frame before correcting itself.

A second thing follows from the same fix, and cost a round of its own to
find: the textarea is `disabled` while its body is still loading
(`onLoad` has not resolved yet), and focusing a disabled element is a
silent no-op in every browser — `document.activeElement` simply stays
wherever it was. The effect that focuses the textarea on open therefore has
to re-run once loading finishes, not only when `open` itself changes, and —
for the same reason as the token above — again on every `openedForToken`
change even when `open` was already `true`. Verified in a browser: the
keyboard shortcut alone, with nothing else scripted, lands real keystrokes
in the note rather than on the page underneath it.

**Typing into an open note must never fire a shortcut.** `shouldHandleShortcut`
in `src/lib/keyboard-shortcuts.ts` is the one place that decides this, kept
pure and unit tested rather than written inline in the key handler: it
refuses any event whose target is an `input`, `textarea` or
`contenteditable` element. `optionIndexForKey` is the other half of the same
file — `1`–`4` or `a`–`d` map to an option index, and nothing else does,
so a stray keystroke can never select an option that is not on screen.

**The question map only ever shows a flag on a question the student has
actually flagged.** `QuestionNav` takes the same `flaggedIds` set the
runner and the result screen use, so a tile's flag marker and the Flag
button's own filled state can never disagree — there is one source of
truth for "is this flagged", read in three places, not three trackers that
could drift. On a phone it opens as a bottom sheet rather than an inline
panel; unlike the header's mobile menu earlier in this file, it needs no
portal, because it renders as a sibling of `<main>` rather than a
descendant of the header's own `backdrop-filter`, so `inset-0` resolves
against the viewport correctly without one.

**A test is swiped on a phone, and clicked everywhere else.** The question
card carries its own `onTouchStart`/`onTouchEnd` pair rather than a
gesture library: a horizontal drag past 60px, more horizontal than
vertical, calls the same `goNext`/`goPrevious` the arrow keys and the
sticky bar's own buttons call. A vertical scroll is not a swipe, which is
exactly why both the distance floor and the horizontal-over-vertical check
exist — the page still has to scroll normally. Below `lg`, the desktop
Previous/Next row and the "Show all questions" link are replaced entirely
by one `fixed` bar (`safe-bottom`) a thumb can always reach: Previous,
a centre button showing "current / total" that opens the question map, and
Next or Finish. The two navigations are not the same markup shown twice —
they are `hidden lg:flex` and `lg:hidden` respectively, so exactly one of
them is ever in the accessibility tree at a time.

**Resuming a test reads its mode from the session row, not from `?mode=`.**
This is a real gap the resume feature would otherwise have reopened, not a
hypothetical one: a resumed test's URL can easily have lost or never
carried `mode=exam` — the resume link only needs `?t=` — and reading mode
from the URL on a resumed test would then treat an exam attempt as study
and hand back verdicts, references and explanations for questions an exam
had deliberately withheld. `lookup.mode` (from `findSession` in
`db/attempts.ts`) overrides the URL's own the moment a session is found
resumable, before anything decides whether to call `getAnswerKey`. Fresh
tests are unaffected — there is no stored mode yet, so `?mode=` still
governs exactly as the rest of this file already describes.

**"Resume your test" reads one query, not a guess.** `findIncompleteSession`
(`db/attempts.ts`) looks up the most recent `test_sessions` row with
`completed_at is null` for a user — scoped to one aircraft on the aircraft
page, unscoped on `/progress` so whichever test is mid-way through, on any
type, surfaces on the dashboard — and left-joins `attempts` for an
answered count the banner can show without a second query. `buildResumeHref`
in `test-options.ts` is the only thing that turns that row into a link: it
is nothing more than `?t=` plus the mode the session already has, because
the test page itself, per the note above, reads everything else — topics,
question ids, the clock — from the row once it gets there.

**The test builder's quick presets are two different shapes wearing one
row of chips.** "All systems" and "My weak systems" only ever pre-select
section checkboxes — the same test-building path every manual selection
already takes. "My flagged questions", "Questions I got wrong" and "Unseen
questions" replace section selection outright with a fixed list the server
already knows (`getFlaggedQuestionIds`, `getQuestionIdsToRetry`,
`pickUnseenTestQuestions`), because none of those is "a topic", and a
student choosing one is not narrowing by section, they are asking for an
exact set. The first two of that second group are exempt from the
free-tier cap for the same reason retry mode already was — every question
in them was necessarily seen already — while "Unseen" is fully subject to
it, being exactly the thing the free tier meters. `PRESET_COUNT_CEILING`
(500) bounds how many ids a preset ever counts or fetches, the same
"protect the machine, not the product" reasoning `MAX_ANSWERS` already
gives above.

**The results screen has exactly three actions, not a menu of them.**
Retake the questions answered wrongly, start a new test on the two weakest
systems (the same `getTopicPerformance` ranking the aircraft page reads for
the "My weak systems" preset, so the two never disagree about which systems
those are), or go back to the dashboard. The pass mark it grades against is
`settings.passMarkPercent` — one more row in the existing `site_settings`
key/value store rather than a bespoke config path, changeable by the owner
at `/owner/settings` with no deploy, the same reasoning `freeQuestionsPerAircraft`
already established there. A signed-out visitor sees the same score and the
same review list — grading needs no account — but the three actions and
the flag/note controls under each reviewed question are replaced by a
prompt to sign up, since none of the three means anything without history
to build from.

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

**`scripts/migrate.ts` does not call `drizzle-orm`'s own `migrate()`, because
that function can silently skip a real migration.** Found live: the Flying
Knowledge migration (`0019_rapid_eternals`, adding
`flying_knowledge_subjects`/`flying_knowledge_questions`) was generated well
before it reached `main`, and by the time its deploy ran, `drizzle`'s
tracking table already held a *later* timestamp from a different migration
generated afterwards but merged first. `drizzle-orm`'s built-in migrator
(`pg-core/dialect.js`) does not check each migration by identity against
every row it has recorded — it reads only the single most recent row and
applies any local migration file whose own timestamp is greater than that
one number. `db:migrate` reported "Migrations are up to date" and exited 0;
`db:seed` then failed with `relation "flying_knowledge_subjects" does not
exist`, on a build Vercel had no way to know was wrong until the very next
line. A generation timestamp was never a promise about deploy order, and
nothing here should have depended on it being one.

`scripts/migrate.ts` now reads migrations the same way
(`readMigrationFiles`, `drizzle-orm/migrator`'s own export — identical
on-disk parsing) but decides what is pending by comparing each migration's
sha256 hash against *every* hash already in
`drizzle.__drizzle_migrations` — the same table, same columns, so a
database migrated by the old code reads as fully up to date and nothing
needs re-running. Reproduced and verified directly, not just reasoned
about: dropping the two Flying Knowledge tables and writing a row with a
timestamp ahead of every real migration into the tracking table makes the
old `migrate()` claim "up to date" while the tables stay missing; running
the fixed script against that same state correctly detects the one missing
hash and applies exactly it, is a no-op on a second run, and works
identically against a database that has never been migrated at all.

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

**`EMAIL_FROM` is a variable of its own, and without it nothing is sent.**
`emailIsConfigured()` needs *both* `RESEND_API_KEY` and `EMAIL_FROM`; the
sender address typed into the key's comment field in the Vercel dashboard
(which is where it was first put) configures nothing, and every reset,
verification and broadcast email was silently printed to the server log
instead — a feature that looked finished and delivered nothing. Both are
now read through `readEnv`, like Stripe's keys. The value is
`PilotQBank <no-reply@pilotqbank.com>`, on the domain verified in Resend.

**Every email goes out in one frame, `src/lib/email/layout.ts`.** A navy header
with the logo mark (`public/icon-192.png`, served from `siteConfig.url`, so it
only shows once deployed), a greeting, one yellow button, an optional quiet
note, the "Safe flying, The PilotQBank team" sign-off, and a footer with the
tagline and a link to `/contact`. Reset, verification, password-changed and
owner broadcasts all use it; the plain-text version is built from the same
spec and carries every link in full. Its colours are hex written by hand —
an email cannot read `globals.css` — so change them with the palette. The
contact form's message to the owner is deliberately unframed.

**The contact form (`/contact`) mails `OWNER_EMAIL` and keeps the message in
the owner's mailbox.** `lib/contact.ts` is the pure half (schema, and the
message it becomes, tested); `app/contact/actions.ts` wires it to the rate
limiter (`contactPerEmail`/`contactPerIp`, their own `contact-*` keys, counted
before the send because what they protect is the inbox), a hidden honeypot
field, the mailbox row (`insertInbound`, best effort, so a message is never
lost to a failed notification) and `sendEmail`. The visitor's address is only
ever `reply_to`; the `from` stays the verified domain. In production a send
that only reached the log is reported to the visitor as a failure rather than
"sent".

**Contact is in the main navigation, and a floating button offers WhatsApp.**
`/contact` is a header link (desktop and the mobile sheet), signed in or out.
`ContactWidget` (`components/contact-widget.tsx`, mounted in `layout.tsx`) is a
round button fixed to the bottom-right corner that opens a small panel: a
WhatsApp link and the contact form. The number lives in `siteConfig.whatsapp`
and `lib/contact-links.ts` (pure, tested) turns it into a `wa.me` link. It is
deliberately absent from `/contact`, `/owner`, the simulators and any `/test`
route, where something else already owns the corner. It is not a chatbot.

**`/owner/mail` is the owner's mailbox: an inbox, a sent list, a composer and
a reply form.** One table, `mailbox_messages`, holds both directions
(`direction` in/out; `source` resend/contact/owner), plain text only — an
inbound message's HTML is never stored or rendered, because the sender is a
stranger and the reader is signed in as the owner. Mail arrives two ways: the
contact form (always) and the provider's inbound webhook,
`/api/webhooks/resend`, which verifies the Svix signature
(`lib/mail/svix.ts`, written out like the Stripe check, with a five-minute
replay window) against `RESEND_WEBHOOK_SECRET` before it reads anything, then
fetches the body by id with the same API key mail is sent with. `provider_id`
is unique, so a webhook delivered twice stores once. If the body cannot be
fetched the message is still stored, with a line saying so.

Receiving needs two things this repository cannot do: receiving enabled for the
domain at the provider, and its MX record added at the DNS host.
`inboundIsConfigured()` (`lib/mail/config.ts`) is true only with both
`RESEND_WEBHOOK_SECRET` and `SUPPORT_EMAIL` set; until then the owner's mail
goes out from the normal sender with the owner's own address as `reply_to`, so
nobody is told to write to an address nothing reads. Once configured, owner
mail is sent from `SUPPORT_EMAIL` and replies come back to the inbox.
`sendMail` is an `ownerAction` (`mail.send`); `db/mailbox.ts` takes no `userId`
like `db/owner.ts`, and its two writers outside `/owner` — the webhook and
the contact form — only ever add a row.

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

**A database ordering is never asserted against a JavaScript one.** Postgres
sorts by the database's collation; `localeCompare` sorts by ICU's. They agree
often enough to be mistaken for the same thing and then disagree on the first
section name containing a space: under `en_US.utf8`, which is what CI's
Postgres runs, a space is ignored at the first level, so `Airplane General`
precedes `Air Systems` — while JavaScript puts `Air Systems` first. The
`listTopics` test asserted a `order by topic` result against a
`localeCompare`d expectation and passed for exactly as long as every section
name was a single word.

It now makes its two claims separately: the contents are compared with both
sides sorted the same way in one language, and the ordering is compared
against the database's own `order by`. Neither assertion depends on the two
collations agreeing. Worth knowing that this cannot be caught on a machine
whose only locales are `C` and `C.utf8` — under `C` the two orders coincide.

**The integration tests run against a real Postgres with the content seeded.**
Several of them — the reports, the retry list, the section queries — are about
behaviour over real questions: which are published, which section they are in,
what survives a question being deleted. They skip themselves when `DATABASE_URL`
is unset, so CI sets one and runs `db:migrate` *and* `db:seed` before `npm run
test`. Migrating without seeding leaves the tables empty, which does not make
those tests pass — it makes them fail, because an empty bank is not a bank.

**A subscription is one row, kept current, not a ledger of payments.**
`subscriptions` has a unique index on `userId`: a renewal, a plan change and
a cancellation all update the same row rather than appending one, because
every query that matters — "does this user have access right now" — only
ever needs the latest state. A history of past payments is Stripe's job,
not this database's, the same reasoning `sessions` uses for "one row per
active session" rather than one per login.

**The free tier is counted from `attempts`, the same table every report
already reads — there is no separate usage counter.** A question counts
once it has ever been answered, on any aircraft-scoped test, finished or
not; answering it again later is free, which is what makes retrying a
question already seen cost nothing further. This is per aircraft, not a
total across the whole bank, so trying a second type does not spend the
allowance meant for the first. `FREE_QUESTIONS_PER_AIRCRAFT` and the rule
itself live in `src/lib/billing/access-policy.ts`, pure and unit tested like
`grading.ts`.

A signed-out student is not metered at all — there is nowhere to count
against, the same gap that already means a signed-out refresh restarts a
test rather than resuming it. See "Known gaps" below.

**The cap holds at two points, not one: what a free account may *see*, and
what it may *answer*.** Early on this only gated `answerQuestion` — a
subscriber, and anyone re-answering a question already counted, always got
through, and everyone else was blocked from grading past the allowance. That
stopped a free account from banking correct answers past its limit, but not
from *reading* past it: nothing stopped a test built for "all questions" or
"500" from being handed the whole bank to page through, unanswered, since
grading was the only checkpoint. `test/page.tsx` now caps the size of a
*freshly built* test the same way, before a single question is fetched: a
signed-in student without an active subscription can never have more than
the aircraft's remaining allowance delivered to the browser in one test, not
just gradeable in one. A *resumed* test is exempt — those questions were
already sent, and there is nothing left to protect by re-checking a
decision already made — and so is a retry test, since it only ever draws
questions the student has already seen. The test builder (`test-builder.tsx`)
is told the same remaining figure so its own "Start test · N questions"
button never promises more than `/test` will actually deliver, the same
"the button never promises more than it delivers" rule the section counts
already followed — and shows an "Upgrade to keep going" link in place of the
button once the allowance reaches zero. This still leaves a narrower gap
than either checkpoint closes on its own: nothing here distinguishes a
question merely *shown* from one *answered*, so a student who starts and
abandons several tests without answering could, in principle, see more than
`FREE_QUESTIONS_PER_AIRCRAFT` distinct questions over many separate visits,
each individually under the cap. Closing that fully would need tracking
exposure separately from `attempts`, which is deliberately not built —
see "The free tier is counted from `attempts`... there is no separate usage
counter" above.

**A blocked question is never itself graded or shown.** `answerQuestion`
returns a `"paywall"` status instead of a verdict when the free allowance
is spent and there is no active subscription; nothing is written to
`attempts` and the correct answer is not revealed. The runner reverts the
optimistic pick it had already shown and points at `/upgrade` instead — the
same principle as "the answer key never arrives before it's earned",
applied to the rare case the size cap above does not already prevent: a
test built while a question or two of allowance remained, then answered
down to zero partway through it.

**Checkout is a page Stripe hosts, started by a form action, not a static
link.** `/upgrade`'s "Subscribe" button posts to `startCheckout` in
`src/app/upgrade/actions.ts`, which calls `createCheckoutSession` in
`src/lib/billing/stripe.ts` — one `fetch` to Stripe's API, no `stripe`
package installed, the same reasoning as `sendEmail`'s Resend call. The
result is a redirect to a page Stripe hosts and is responsible for PCI
compliance on; no card details ever reach this server. The two plans are
recurring Prices created once in the Stripe dashboard, each already priced;
a price change is an edit there, never a deploy here. Both the signed-in
user's id and the chosen plan are set as `subscription_data[metadata]` at
checkout, so every later event for that subscription — a renewal, a
cancellation, years after the checkout page is closed — still carries them,
which is what the webhook reads.

**A subscription is only ever turned on by a signature, never by a claim.**
`/api/webhooks/stripe` verifies every event's `Stripe-Signature` header
(`verifyStripeSignature` in `src/lib/billing/stripe-webhook.ts`) against an
HMAC-SHA256 computed from the raw request body and the endpoint's own
signing secret before acting on anything in it — a payload that does not
reproduce it is answered and dropped, not processed "just in case". This is
the one path that can grant access, so it is held to the same standard as
password verification and session tokens elsewhere in this file: nothing
here is trusted on its own say-so. The check also rejects a genuinely
signed request replayed long after the fact, the same concern rate limiting
and reset tokens elsewhere in this file exist for.

**The webhook only ever handles the subscription's own events**
(`customer.subscription.created` / `.updated` / `.deleted`), never
`checkout.session.completed`. A `Subscription` object carries its `status`
and a period end directly — read and stored as-is, not derived — so there
was no need to repeat the "compute it, don't trust the webhook" trick the
earlier 2Checkout attempt needed for a figure Stripe already states
plainly. `mapStripeSubscriptionStatus` in `access-policy.ts` narrows
Stripe's several statuses down to the two this app stores: only `active`
and `trialing` count as active, and everything else — `past_due`,
`unpaid`, `incomplete`, a plain `canceled` — is treated as not, since
nothing here offers a trial or a grace period. A cancellation raised from
Stripe's own customer portal, which may arrive without the metadata set at
checkout, falls back to looking the row up by the subscription's own id
(`findSubscriptionByProviderRef`).

**"Directly" turned out to need a second look.** `current_period_end` moved
off the `Subscription` object under this account's billing API behaviour —
it lives on each line item instead
(`items.data[0].current_period_end`), because a subscription can now hold
several independently billed items. The first real checkout on this
project silently failed to unlock anything because of exactly this: the
webhook read a field that no longer existed, stored `null`, and
`hasActiveSubscription` — correctly, given `null` — treated the row as not
yet confirmed, on a subscription Stripe itself already showed as `active`.
`extractCurrentPeriodEnd` in `stripe.ts` now reads the top-level field when
present and falls back to the first item's, which is the only item any
subscription this app creates ever has. Worth remembering if Stripe moves
another field the same way: a webhook payload matching yesterday's
documentation is not evidence it matches today's account.

**And live mode had its own version of that lesson: every Price's Product
needs a `tax_code`.** This account has Stripe's Managed Payments enabled by
default, which refuses to create a Checkout Session for a product that has
none — so the *first* live subscription attempt would have failed with
"the product tax code is missing", and the student would have seen
`startCheckout`'s generic "Checkout could not be started". Test mode never
asked for it, so nothing in the test-mode verification could have caught
this; it was found by asking Stripe for a live Checkout Session directly,
before any student could. Both live Products carry
`txcd_20060058` — *Training Services, Self-study Web-based*, which is what
this app is: web-delivered, self-directed, not instructor-led, nothing
downloadable. It is set on the **Product** in the dashboard, not in this
repository, so it is not a deploy — but it is load-bearing, and a new plan
added later needs it too or that plan alone will fail to check out.

**A Price also has to say whether its number includes the tax.** The first
real payment charged **€12.09** for the plan the page calls €9.99: Managed
Payments read `tax_behavior: unspecified` as "this figure is before tax"
and added 21% Belgian VAT on top. Nothing was broken — the charge, the
webhook and the subscription were all correct — the *price* simply was not
what the screen said, and only a real card could show that, because a
Checkout Session quotes no tax until there is a customer to place. Both
live Prices are now `tax_behavior: inclusive`, so €9.99 is what the student
pays and the VAT is taken out of it; the old ones are archived.

This is a rule about the product, not a detail of the integration: the
prices here are shown to individual students, and a consumer price in the
EU is quoted including VAT. Any Price added later has to be `inclusive`
too — `tax_behavior` cannot be changed after a Price is created, so getting
it wrong means making a new Price and re-pointing the environment variable,
which is exactly what this cost.

The general rule all three findings point at: **the live account is a
different system from the test account, and only a live request proves a
live path** — a real card most of all.

**Anyone without access gets one upgrade dialog, and what a subscription is
stays clear before there is an account.** `UpgradePrompt` (server, mounted in
`layout.tsx`) renders `UpgradePromptDialog` for a signed-out visitor and for a
signed-in account with no active subscription — a subscriber or gift-code
holder never has it in the page. On `/pricing` it opens at once and ignores
the snooze, because that is where somebody went to read exactly this;
elsewhere it waits five seconds, skips `/upgrade`, `/redeem`, the auth pages,
`/owner` and any `/test` route (a modal over a question being read costs the
student more than a missed pitch), and snoozes itself for three days in
`localStorage` whether it was dismissed or followed. Signed out, its buttons
are "Create a free account" and "Log in to subscribe"; signed in, "See plans
and subscribe". `/pricing` is now a real page, readable by anyone: a Free card
beside a Subscribed card. The price text and the list of what a subscription
adds live in `config/pricing.ts` and are shared by the dialog and the page;
the price is edited by hand with the Stripe Price. The list says only what a
subscription actually changes — the cap on questions — and says plainly that
Pilot Sims and Flying Knowledge are free for everyone, because they are.
Presenting them as paid features would be untrue; making them paid is a
product decision that would need an access model of its own.

**A signed-in student can change their password at `/account`, and every
change is announced by email.** `changePassword` (`src/app/account/actions.ts`)
asks who is signed in for itself, requires the current password, checks the
log-in rate limit *before* verifying it (a wrong current password counts as a
failed log in, so the form is not a guessing oracle for a stolen session),
destroys every other session and gives this device a fresh one. A
"your password was changed" notice (`lib/email/password-changed-email.ts`,
pure and tested) goes out after this and after a reset by link, so a change
somebody else made is not silent. `/account` is in `robots.ts`' disallow list.

**An email address is confirmed by a link, and only subscribing waits for it.**
Sign-up mails a link (`lib/auth/verification-mail.ts`, best effort — practice
never waits on an inbox); `/verify-email` looks it up without spending it and
a button spends it, for the reason reset links work that way. The design is
`password_reset_tokens` again: 256 bits, only the SHA-256 stored
(`email_verification_tokens`), one live link per account, spent in one atomic
update whose `where` also refuses an expired link — a day, not an hour, since
a link that only proves an inbox grants nothing. `users.email_verified_at` is
null for every account that existed before this, because nobody has proved
anything yet. An unconfirmed account loses exactly one thing: `startCheckout`
refuses it and `/upgrade` shows a "confirm your email" card instead of the
plans. A banner under the header and an Email card on `/account` (with a
resend button, rate limited on mail under its own `verify-email:` keys, three
an hour) lead there. The `SessionUser` carries `emailVerified`.

**The owner can write to students, and every message can be refused.**
`/owner/messages` composes a plain-text message, aims it at one of four
audiences (everyone, subscribers, free accounts, access ending within two
weeks — `lib/broadcast/audience.ts`, using the accounts screen's own "active"
and "soon"), and sends it by email. "Only confirmed addresses" defaults on,
because an unconfirmed address may be somebody else's and every bounce or
spam report damages the sending domain for everyone; the owner can switch it
off and each audience's count, with and without it, is on the button, so it
never promises more than a send delivers. Anybody who has unsubscribed
(`users.broadcast_opt_out_at`) is left out of every audience with no option to
include them.

Every message ends with a footer the owner cannot remove — why they are
receiving it and an unsubscribe link (`composeBroadcastEmail`, pure and
tested) — plus `List-Unsubscribe` and one-click headers. The link carries a
random token unique to that one email; only its SHA-256 is stored
(`broadcast_deliveries.unsubscribe_token_hash`). `/unsubscribe` looks the
token up and a button spends it, and `/api/unsubscribe` takes the mail
client's own POST — a GET there only redirects to the page, so a scanner
opening the link unsubscribes nobody. `/account` has the same switch.
Transactional mail (a reset link, a verification link, a security notice) is
never affected.

Sending is a queue in the database, not a long request. `createBroadcast`
fixes the recipient list in one transaction (`broadcast_deliveries`, one row
per student, unique per broadcast); `sendNextBatch` claims eight rows with
`for update skip locked` — so two tabs never send the same email, and a row
left `sending` is reclaimed after five minutes — sends them about half a
second apart (a provider's two-a-second limit) and marks each `sent` or
`failed`. The progress page calls it in a loop and says how it is going;
closing the tab is safe, "Continue sending" resumes, "Queue the failed ones
again" retries. It refuses to run without a mail provider, because without
one `sendEmail` only prints to the log and every delivery would be marked
sent for mail nobody received. **`sendBatch` is the one owner action not
wrapped in `ownerAction`**: the decision to send is audited once, as
`message.send`, and a row for every batch of eight would bury it; it still
calls `requireOwner()` first. A provider's own daily limit is the usual cause
of failed deliveries, and is the owner's to know.

**A refund does not cancel a subscription — they are two separate Stripe
operations, and the app only reacts to the second one.** Refunding the
first live charge from the dashboard gave the money back but left the
subscription `active`, because `/api/webhooks/stripe` only turns access off
on `customer.subscription.deleted` (or `.updated` carrying a non-active
`status`), and a refund raises neither — it is an event on the *charge*,
which this app never subscribes to. The account kept full access until the
subscription was cancelled as its own, separate action (`DELETE
/v1/subscriptions/:id` from the dashboard or the API), which is what
actually raised the `.deleted` event and cleared the row. Worth remembering
whenever a live refund is issued: it is not the undo button for access, and
the subscription needs cancelling too if the point is to take access back.

**Configuration is read through `readEnv`, never straight off
`process.env`.** `src/lib/env.ts` trims whitespace, strips surrounding
quotes, and strips a leading `NAME=` — the three ways a *correct* value
arrives wrong when it is pasted into a hosting dashboard instead of written
into a file. The middle one is not hypothetical: the first live checkout on
this project failed with "Invalid API Key provided: STRIPE_S…", because the
whole line `STRIPE_SECRET_KEY=sk_test_…` had gone into Vercel's value box
and Stripe was being handed the variable's name along with its key.

This does not make a wrong value right — a key for the wrong account, or a
truncated one, still fails at the provider, and should. It only stops a
right value from failing over how it was carried.

Beside it, `looksLikeSecretKey` and `looksLikePriceId` check that a
configured value is *shaped* like the thing it claims to be before anything
is sent. A value that could never work now reads as "payments are not
configured" on `/upgrade`, rather than rendering a Subscribe button whose
only outcome is the provider's error.

`looksLikeSecretKey` accepts `rk_` as well as `sk_`, and that is the shape a
deployment should actually carry. This app asks Stripe for exactly one thing
— a Checkout Session — so the key it runs on needs no permission to read a
customer, refund a charge or create a price, and a *restricted* key granting
only "Checkout Sessions: write" is therefore the whole of what production
needs. Accepting only `sk_` would have forced a key that can do everything
into a hosting dashboard in order to do one thing. The webhook route needs
no key at all: it verifies a signature against `STRIPE_WEBHOOK_SECRET` and
calls nothing.

**Free access does not have to come from Stripe — `provider` on
`subscriptions` exists for exactly this.** A gift code — now a
general-purpose **license key**, see below — is the second thing that can
turn a subscription on, alongside Stripe's webhook. Minting one has two
doors, both calling the same `createGiftCodes`: `npm run gift:generate --
--count 5 --days 30 --plan monthly --note "…"` for bulk or scripted use
(unchanged, still single-use by default), and `/owner/gift-codes` on the
live site, which now goes well past "I need one code, right now" — see
below. Redeeming is the one path a student drives themselves, at
`/redeem`: `redeemGiftCode` in `db/gift-codes.ts` claims the code and
writes the `subscriptions` row in one transaction, with `provider: "gift"`
and no `providerSubscriptionRef`.

**`/owner` is not an admin panel — it is a gated area behind one email,
most of it now writing, not just reading.** `isOwner` compares the
signed-in account's email against `OWNER_EMAIL`, read the same tolerant way
every other configuration value is. Anyone else visiting any path under
`/owner` — signed out, or signed in as anyone else — gets a plain
`notFound()`, not a redirect to `/login`: a redirect would confirm the path
exists for someone it does not; a 404 says nothing. There is still no role
column and no second owner — the day this needs more than one person, that
is the real feature to build, not a second email in an env var.

The gate is `requireOwner()` and every page and action in the area calls it
first, including the one the page itself renders: **a server action is its
own reachable entry point**, so a page having checked does not cover the
action beside it. One function rather than the check written out five
times, because the copy that gets forgotten is the one that leaks the
site.

**Every mutating action in this area is wrapped in `ownerAction`
(`src/lib/owner/audited-action.ts`), and that wrapper is what makes the
audit log complete rather than "complete for whichever action remembered
to log itself".** It calls `requireOwner()`, runs the action's own
`parse`/`run`, and — only if `run` reports the mutation actually
happened — writes one row to `audit_log` (`actorEmail`, `action`,
`targetType`, `targetId`, a `jsonb` `metadata`) and revalidates whatever
paths the action names, which may depend on the parsed input (a grant
revalidates both the accounts list and that one account's own page). A
`parse` failure (bad input) or a `run` that declines to act (a stale id, a
business rule refusing the request) logs nothing, because nothing
happened. `/owner/audit-log` reads it back: the last 200 entries, newest
first, filterable by action. Nothing here needed a second role — the log
records *who*, but "who" is still always the one `OWNER_EMAIL`; it exists
for "what did I do and when", not for telling two owners apart.

**`src/db/owner.ts`, `src/db/broadcasts.ts`, `src/db/mailbox.ts` and
`src/db/logbook-owner.ts` are the only modules in the codebase whose queries take no `userId`, and
the first two the only ones that write to a row without one.**
(`broadcasts.ts` reads every account to build a mailing list;
`logbook-owner.ts` reads Logbook Scanner usage and cost, never content; the
rest of this paragraph is about `owner.ts` and holds for all three.) Every read in `reports.ts` filters on one, precisely so a
student can never see another's history; this file inverts that on purpose
and is the more dangerous for it. The whole guard is that every caller sits
under `/owner` behind `requireOwner()`, which is why the inversion is
stated at the top of the file itself — nothing else may import it. The two
writes there raise the stakes rather than change the rule: an unscoped read
shows one person data that is not theirs, while an unscoped write hands
them somebody else's subscription.

What the area shows, and why each earns its place: **Overview** (six
counts plus open report count), **Insights** (read-only analytics — see
below), **Subscribers** (who has access, from Stripe or a gift, and when
it ends — decided by `hasActiveSubscription`, the same function the paywall
uses, never by reading `status` alone, since a row can say `active` and
still be over), **Gift codes** (now general-purpose license keys — see
below), **Reports** (a "report a problem" inbox — see below), **Aircraft
requests**, **Accounts**, **Settings**, and **Audit log**. Aircraft requests
closed a real hole: the `aircraft_interest` table had been collecting
addresses since the landing page shipped with **no way to read it from
anywhere but `db:studio`**. It is tallied by aircraft as well as listed,
because the decision it exists to inform — which bank to write next — is a
question about counts.

**Accounts is paginated and filterable, and pairs a list with a detail
page.** `listAccounts` in `db/owner.ts` takes a search term, a status
filter (`all` / `active` / `expiring_soon` / `lapsed` / `free_tier`, each a
SQL condition matched against `hasActiveSubscription`'s own
`status = 'active' and current_period_end > now()` check rather than
`status` alone — the same reasoning the list's own access column already
used), and a limit/offset — the total comes from `count(*) over()` in the
*same* query rather than a second round trip, so the count and the page of
rows can never disagree about which filter they answered. It searches by
email through a plain GET form so a result, and a page of results, can
both be linked to.

Each row links to `/owner/accounts/[userId]`: the same grant/revoke
controls, plus redemption history (every code this account has ever
redeemed, from `gift_code_redemptions`), a test-session count next to
tests *completed* (the gap between them is abandoned tests), last-active
date, and an owner-only note (`account_notes` — one row per user, upserted,
never shown to the account itself; its own table rather than a column on
`users`, for the same reason `db/owner.ts` is its own module: `users` is
auth's table, read by ordinary sign-in and sign-up paths that have no
business knowing an owner's notes exist).

`grantAccess` gives an account days of full access with no Stripe and no
code, writing `provider: "manual"` rather than `"gift"`: both are free
access, but only one of them traces back to a row in `gift_codes`, and "I
typed this in" should be distinguishable from "somebody redeemed a code I
minted" a year later. It reuses `computeGiftPeriodEnd` rather than
reimplementing it, so a manual grant extends and never replaces — thirty
days handed to somebody who already has ninety leaves ninety.

`revokeAccess` sets `status: "canceled"` and deliberately leaves
`currentPeriodEnd` where it was: `hasActiveSubscription` already refuses
anything not `active`, and keeping the date means the row still records what
the account had. What revoking does **not** do is cancel anything at Stripe —
the subscription keeps billing and its next renewal writes the row back to
`active`, which is the webhook doing its job. That is the same lesson the
refund note above records, so the screen says it in place rather than
letting the owner infer that money has stopped moving. Revoke is now a
two-step confirm in the browser (click reveals "yes, revoke" / "cancel"
rather than acting immediately) and the confirmation is checked again in
the server action itself — a bare `confirmed` flag in the form, since a
server action is its own reachable entry point and a confirm step only the
client enforces is not a confirm step at all.

The search escapes `%` and `_` before it reaches `ilike`. An owner typing an
address into a box is not writing a pattern, and silently treating it as one
would return the wrong account — which, on a page whose buttons change
somebody's access, is the kind of wrong worth a line of code.

**Gift codes are now general-purpose license keys, and the redemption gate
moved off the code row and onto a count.** Originally single-use:
`gift_codes.redeemed_by_user_id` was null until claimed, and claiming was
one atomic `update ... where redeemed_by_user_id is null`. A code can now
be redeemed by more than one person (`max_redemptions`), so "has this code
been spent" is no longer a single column — it is `count(*) from
gift_code_redemptions where gift_code_id = ?` compared to
`max_redemptions`, and the child table is also the answer to "who redeemed
this, and when" on the code's own detail page
(`/owner/gift-codes/[giftCodeId]`). Making that count-based gate safe
against two redemptions racing for the last remaining slot needs an
explicit lock the single-column version got for free from its own
`where`: `redeemGiftCode` opens with `select ... for update` on the code
row before counting. `redeemed_by_user_id`/`redeemed_at` on the parent row
still exist, but now mean only "who redeemed this *first*" — kept for
backward-compatible display, never read to decide whether a redemption may
proceed. A code can also carry an `expires_at` (goes stale on its own) and
a `disabled_at` (the owner turned it off without deleting it or its
redemption history — a two-step confirm, the same shape as Accounts'
revoke). Generation is bulk, up to 200 at once, downloadable as CSV either
for the batch just minted (built client-side from the list already on
screen) or for every code ever minted
(`/owner/gift-codes/export`, `requireOwner()`-gated like everything else
here). `/redeem` is now rate limited per user and per IP
(`RATE_LIMIT_RULES.redeemPerUser`/`redeemPerIp`, reusing `login_attempts`
under `redeem-user:`/`redeem-ip:` key prefixes, checked *before* the code
is even looked up — the claim is real transactional work a flood of
guesses should never reach).

A code can also record `unlocks_aircraft_code` — which aircraft it is
"for" — **but this is not enforced.** `subscriptions` is one global row per
user with no aircraft scoping, so redeeming a code with this set still
grants full access to every aircraft, identical to a code with it unset.
Wiring this up for real would mean an aircraft-scoped access model
touching `answerQuestion`, the test-page size cap, `/upgrade`, and every
owner access screen — a payments-architecture change wearing a gift-code
hat, out of scope here and flagged rather than half-built. The field
exists so the owner can record and communicate intent now, ahead of that
model existing.

**Reports is a "something's wrong with this question" inbox, and it never
touches `questions`.** A "Report a problem" control sits next to the flag
button in the test runner, rendered whether or not the student is signed
in — a report is about the question, not a personal study aid, so it needs
no account the way a flag does. It writes one row to `question_reports`
(`questionId` with **no foreign key**, the same reasoning `attempts` and
`question_flags` already give: `db:seed` deletes questions whose content
files are gone, and a report must survive a content edit exactly as an
attempt does; `userId` nullable for a signed-out reporter; a reason enum;
an optional comment; a status). `/owner/reports` lists them, filterable by
status, each shown beside the question's *current* text, options (the
correct one marked) and explanation, read left-joined from `questions` so
a report on a since-edited or since-removed question still appears with
its report intact, just without current wording to show. The only action
is marking a report resolved or dismissed — there is deliberately no edit
button here; fixing a question is still the content-file-and-deploy
workflow this phase does not touch.

**Insights is read-only, and none of its numbers double as a queue.**
Every query in `db/insights.ts` is a count or a bounded aggregate, and
none of it writes to `questions` or `aircraft`, or links anywhere
actionable — it exists for the owner to act on manually through the tools
above and the content workflow, not to grow a second admin surface. The
signup funnel (last 7 and last 30 days) is a genuine funnel, not four
independent counts: signups, and how many of *that same cohort* went on to
complete a test, hit the paywall (see `paywall_hits` below), and redeem a
code or subscribe, each stage a subset of the last. It is one query —
`count(*) filter (where exists (...))` per stage against `users` bounded
by `users_created_at_idx` — rather than four round trips or a join that
would multiply a user row by every session or answer, the same
join-avoidance reasoning `listAccounts` already uses for its own activity
counts. `paywall_hits` is new for exactly this: `answerQuestion`'s
`"paywall"` branch used to write nothing at all, so "users who hit the
paywall" had no data behind it; it is scoped to `userId` and
`aircraftCode` only, a funnel signal, not a per-question record.

The rest of the page is simpler counts: active subscriptions and those
expiring within `EXPIRING_SOON_DAYS` (the same figure the Accounts status
filter uses, so the two screens never disagree about what "soon" means),
codes redeemed this month, the most-flagged questions
(`question_flags`, count-desc), and aircraft-interest signups (reusing the
existing `/owner/interest` queries). The one query worth knowing the cost
of is the question-quality signal: first-attempt correct rate per
question, split into a below-25% list (likely broken) and an above-95%
list (likely trivial), each requiring at least
`MIN_ATTEMPTS_FOR_QUALITY_SIGNAL` (20) first attempts to appear at all.
"First attempt" is each `(question_id, user_id)` pair's earliest row by
`answered_at` — a student who got a question wrong once and right on a
retry must not inflate the rate as if it were two independent tries at the
same difficulty — computed with a `distinct on (question_id, user_id)`
CTE over the whole of `attempts`. `attempts_question_id_idx` lets Postgres
avoid a full table scan per question; a composite index covering
`(question_id, user_id, answered_at)` would serve the `distinct on`'s own
ordering directly and is the first thing to add if this page gets slow on
a bank with a lot of history, deferred because it would only ever serve
this one owner-only page at the cost of extra width on a table every
answer already writes to. Verified against a real, locally seeded
Postgres with synthetic data (not just reasoned about): the funnel, the
access counts, and both quality-signal lists all produced the expected
numbers, and every new index in this phase exists in the database exactly
as `schema.ts` describes.

**Settings is the second page that writes, and it is deliberately small.**
`site_settings` is a key/value table — adding a setting is an insert, not a
migration — holding the free-question allowance
(`FREE_QUESTIONS_PER_AIRCRAFT`'s default, now an override the owner can
change without a deploy), the signed-out preview allowance beside it
(`PREVIEW_QUESTIONS_SIGNED_OUT`, a separate and much smaller number — see
the convention on the preview above), a one-line announcement banner shown
above every page, the pass mark shown on a result screen, and — moved here from a
hardcoded `src/config/aircraft-marketing.ts`, now deleted — the featured
type rating aircraft code (named in the landing page's structured data, not
its hero — see the note on the three sections above) and the set of type
rating aircraft marked "in development". Both of
those last two only decide what search engines and `/type-rating` say about
aircraft rows that already exist; **neither ever writes to the `aircraft`
table**, and `updateSettings` checks the chosen codes against the real
aircraft that exist (a database read, so it happens in the action, not in
`validateSettings`, which stays pure and DB-free) before saving either one.
Nothing else lives here on purpose. Content is `/content`'s job and
`db:seed` rewrites `aircraft` and `questions` from those files on every
deploy, so a setting that duplicated what a file already owns would be a
second source of truth the files silently overrule; prices are Stripe's,
changed there, never here; the product's name and branding stay in
`src/config/site.ts`. What belongs in `site_settings` is only what no file
describes.

**The owner can hide and rename, never delete or recode.** Settings also
holds `hiddenSections`/`hiddenItems` (a section, or one aircraft, class
rating or subject, leaves menus, pickers, landing counts and the sitemap,
and 404s for everyone but the owner), `sectionLabels` (section names and
landing-card text) and `itemOverrides` (an aircraft's display name and
description, keyed `section:CODE`). All of it is a display layer over
content: codes, ids, questions and attempts are never touched, which is why
it survives `db:seed`. A hidden item's server actions are not gated.

`src/lib/settings.ts` is pure, like `access-policy.ts` and `grading.ts`:
`validateSettings` is the only way a value is written, and refuses loudly —
the one person who can fix a bad value is the one who just typed it.
`parseSettings`, reading the stored rows back, is the opposite temperament,
and deliberately so: every setting has a default in code, a missing or
corrupt row falls back to it rather than erroring, and that is what makes
an empty table on a fresh clone behave exactly like this application did
before settings existed. `getSiteSettings` in `db/settings.ts` wraps the
read in the same `catch` — a settings lookup is never what the page it runs
inside is *for*, least of all `answerQuestion`, which now reads it to learn
today's allowance before deciding whether a question may be graded.
`remainingFreeQuestions` and `canAnswerQuestion` both take the limit as an
argument rather than reading the constant directly, for exactly that
reason: they still have to stay pure, and a pure function cannot go and
look a setting up for itself.

The claim is atomic the same way `consumeResetToken` is, though the
mechanism has since changed — see "Gift codes are now general-purpose
license keys" above for what replaced the original `where
redeemed_by_user_id is null` once a code could be redeemed more than
once. Either way, the point is the same: a race between two redemption
attempts is resolved by the database, never by a check-then-write in
application code that a race could slip between.

**A gift code only ever extends access, never shortens it.**
`computeGiftPeriodEnd` takes the later of "now plus the code's duration" and
whatever `currentPeriodEnd` the account already has, so a student already
paying through Stripe who redeems a code (a friend's gift, a promotion)
cannot come out with an earlier expiry than they had. The one loose end this
leaves: redeeming while a real Stripe subscription is active overwrites that
row's `provider` to `"gift"` and clears `providerSubscriptionRef`, even
though the date itself is protected. This heals itself at the Stripe
subscription's own next `.updated` event — a renewal sets `provider` back
to `"stripe"` unconditionally — so the only window where it reads wrong is
between the redemption and that next renewal, and nothing user-facing reads
`provider` directly (`hasActiveSubscription` only ever looks at `status` and
`currentPeriodEnd`). Worth revisiting only if a second surface ever depends
on `provider` for a decision, which nothing does today.

**Anyone with access can see how long it lasts.** `daysRemaining` is the
one number a student actually wants once they have paid or redeemed, and
`/upgrade` leads with it. It rounds **up**, deliberately: eleven hours left
is a day of studying ahead, and reading "0 days" on a screen that still
lets you practise would be both wrong and alarming — zero is reserved for
access that has genuinely ended. A gift-funded account is told plainly
where its access came from and that another code would *add* to it rather
than replace it, which is what `computeGiftPeriodEnd` already guarantees.

Codes are 16 characters from a 32-symbol alphabet that excludes `0`, `1`,
`I`, `L`, `O` — the letters and digits people most often transcribe wrong —
formatted in groups of four for readability, and looked up after
`normalizeGiftCode` strips whatever separators or casing the redeemer typed.
80 bits of that alphabet is far more than the table's own uniqueness needs;
it is sized against guessing, the same reasoning as a password reset token,
just a smaller number because what a wrong guess would buy here is a free
subscription, not an account.

**A provider's error message is for the log, not for the student.** Stripe's
"Invalid API Key provided: …" describes this deployment's configuration:
useful to whoever owns it, useless to somebody who only wants to subscribe,
and not theirs to read. `startCheckout` logs the detail and puts a sentence
the student can act on ("Checkout could not be started. Please try again in
a moment.") on the screen. That is the same split the rest of this file
makes everywhere else — say plainly that something failed, without handing
over the internals.

**One feature per session, one pull request per feature. `main` always works.**

## Layout

```
content/                      Question files. The source of truth.
  <code>/                     One folder per type rating aircraft (b737/, a320/ today)
  classes/<code>/             One folder per class rating aircraft (da40/ today)
  flying-knowledge/<code>/    One folder per Flying Knowledge subject (pof/, hpl/, met/, rnav/, law/, agk/, ops/, com/, mb/, perf/, inst/ today)
drizzle/                      Generated SQL migrations. Committed.
public/                       Manifest icons, the service worker, and any
                              <code>-study-guide.html study guides (see the
                              note on `lib/study-guide.ts` below)
scripts/
  validate-content.ts         Schema check. Runs before build and seed.
  migrate.ts                  Applies migrations.
  seed.ts                     Syncs content into the database.
  generate-icons.tsx          Rasterises the Q favicon (from public/favicon.svg) into the app and manifest icons. Run by hand, outputs committed.
src/
  app/
    globals.css               THE design tokens. Colour, type, spacing, radius, shadow.
    fonts.ts                  The two faces, via next/font
    layout.tsx                The shell: header, footer, metadata, viewport
    page.tsx                  The marketing landing page
    _landing/                 Its sections: hero (+ the drawn 737 backdrop) with
                              PillarLinks, pillars-overview (the three pillar
                              cards), trust, how it works, features, FAQ, final CTA
                              (reuses PillarLinks)
    type-rating/               Type Rating Systems Knowledge picker ("Choose an aircraft")
    type-rating/[code]/        One aircraft's overview
    type-rating/[code]/test/   Test runner, grading action, result screen, shortcuts-overlay
    class-rating/               Class Rating Systems Knowledge picker — the same shape as
                                type-rating/, reading the parallel content tree (see the
                                note on "many aircraft, in two trees" above)
    class-rating/[code]/
    class-rating/[code]/test/
    flying-knowledge/          The third section — the same picker/overview/test
                              shape as type-rating/ and class-rating/, reading the
                              third content tree (POF today). Free in full: no
                              free-tier cap, no subscription gate
    flying-knowledge/[code]/
    flying-knowledge/[code]/test/
    atpl-ground-school/         The EASA ATPL Ground School picker: fourteen subjects, live or coming soon
    aircraft-systems/           A thin chooser in front of type-rating/ and class-rating/
    aircraft/, class/,
    aviation-knowledge/         Legacy redirects only — see "Old links still work" above
    (auth)/                   Sign up, log in, log out
    progress/                 Reports, overall, per aircraft, per class rating and
                              per Flying Knowledge subject
    upgrade/                  Checkout for the two plans, and the Stripe redirect action
    redeem/                   Where a gift code becomes an active subscription
    owner/                    Owner-only: overview, insights, accounts (+ per-account detail),
                              subscribers, gift codes (+ per-code detail, CSV export),
                              messages (+ per-message delivery), reports, aircraft requests,
                              settings, audit log
    account/                  The signed-in student's own page: email, access, password, messages
    unsubscribe/, api/unsubscribe/   The link at the foot of a message, and one-click
    api/webhooks/stripe/      The Stripe webhook endpoint
    api/logbook/extract/      Logbook Scanner: one photo in, one transcribed page out
    api/cron/instagram/       The Instagram agent's daily run (vercel.json schedules it)
    api/instagram/card/       The signed card images Instagram fetches
    tools/logbook/            Logbook Scanner: landing, and [logbookId]/ the scan-review-results app
    about|pricing|faq|terms|privacy|contact/   Short pages the footer links to
    manifest.ts               Web app manifest
    sitemap.ts                sitemap.xml — every public page, generated from the
                              same three content trees the landing page reads
    robots.ts                 robots.txt — points at sitemap.ts; disallows the
                              legacy redirects and every account-only page
    opengraph-image.tsx       The 1200x630 social card
    favicon.ico                                 Generated; the rest of the favicon set is in public/ (favicon.svg, favicon-32x32.png, apple-touch-icon.png)
  components/                 Shared UI, including the shell (site-header,
                              site-footer, mobile-nav, user-menu, theme-toggle, logo),
                              flag-button, question-note, resume-test-banner,
                              report-question-button
  config/
    site.ts                   THE product name, tagline, description and URL — not site_settings, see the convention above
  content/
    schema.ts                 THE question schema — type rating aircraft
    class-schema.ts           THE question schema — class rating aircraft, a
                              deliberate near-mirror of schema.ts
    flying-knowledge-schema.ts THE question schema — Flying Knowledge subjects,
                              a deliberate near-mirror of class-schema.ts
    load.ts                   Reads and validates /content (type rating)
    load-classes.ts           Reads and validates content/classes/ (class rating)
    load-flying-knowledge.ts  Reads and validates content/flying-knowledge/ (Flying Knowledge)
  db/
    schema.ts                 Drizzle tables
    queries.ts                Every read the app performs — type rating
    class-queries.ts          The same, for class ratings — a near-mirror of queries.ts
    flying-knowledge-queries.ts The same, for Flying Knowledge subjects — a near-mirror
                              of class-queries.ts
    users.ts                  Account reads and writes
    password-reset.ts         Issuing and spending reset links
    subscriptions.ts          Subscription row and the free-tier count
    flags.ts                  Toggling and reading a student's flagged questions
    notes.ts                  Reading and upserting a student's own note on a question
    gift-codes.ts             Minting and redeeming license keys; listing, per-code redemption history
    question-reports.ts       Creating and listing "report a problem" rows; joins questions read-only
    audit-log.ts              Writing (from ownerAction only) and reading the owner action log
    broadcasts.ts             Audiences, the delivery queue and its counts. /owner only, like owner.ts.
    mailbox.ts                The owner's inbox and sent mail. /owner only, plus two add-only writers (webhook, contact form).
    email-verification.ts     Issuing and spending email verification links
    unsubscribe.ts            Unsubscribe by token, and the account page's own switch
    insights.ts               Read-only analytics queries for /owner/insights
    settings.ts               Reading and writing site_settings; owner-only write, publicly read
    owner.ts                  THE unscoped reads, and grant/revoke/notes. /owner only; see the convention above.
    logbooks.ts               Logbook Scanner: logbooks, the spread meter, unlocks and credits (user-scoped)
    logbook-owner.ts          Logbook Scanner usage and cost, unscoped. /owner only, like owner.ts.
    instagram.ts              The Instagram agent: pick a question, claim the day, record the post. Flying Knowledge only.
    index.ts                  Connection pool
  proxy.ts                    Mints the signed-out visitor cookie on /type-rating/* and /class-rating/*
  lib/
    email/
      send.ts                 sendEmail: Resend, or the server log
      layout.ts               The shared email frame (pure, tested)
      reset-email.ts          The reset message (pure, tested)
    mail/                     The mailbox's pure halves: Svix signature check, parsing a received
                              message, composing the owner's outgoing mail, whether inbound is set up
    billing/
      access-policy.ts        Free-tier and subscription rules (pure, tested)
      stripe.ts                Checkout session request + Stripe API call (pure builder, tested)
      stripe-webhook.ts        Webhook signature verification (pure, tested)
      gift-codes.ts            Code shape, normalisation, extend-only arithmetic (pure, tested)
    settings.ts              What the owner may change from the website (pure, tested)
    env.ts                    Reading configuration, tolerantly (pure, tested)
    canonical-url.ts          This deployment's own address, safe to publish — shared
                              by layout.tsx's canonical tag, sitemap.ts and robots.ts
    seo/
      sitemap-entries.ts       Builds sitemap.xml's URL list from the three content
                              trees (pure, tested)
    instagram/                The Instagram agent: rhythm and captions, signed card urls, card drawing, Graph API client (pure, tested; config.ts reads env)
    logbook/                  Logbook Scanner: model, time parsing, validation engine, summary,
                              extraction schema and prompt, entitlement, exports (all pure, tested)
                              — plus claude.ts (the API call) and config.ts (env switches)
    grading.ts                Scoring (pure, tested)
    question-status.ts        What the question map may say (pure, tested)
    password.ts               scrypt hashing (pure, tested)
    test-options.ts           Test length, sections, mode, the clock, and test URLs
    study-guide.ts            studyGuideHref() — whether `public/<code>-study-guide.html` exists
    keyboard-shortcuts.ts     Which key does what, and when a shortcut must stand down for a text field (pure, tested)
    auth/
      credentials.ts          Email and password rules (pure, tested)
      rate-limit-policy.ts    When to refuse a log in or a reset (pure, tested)
      reset-policy.ts         Reset link lifetime and state (pure, tested)
      client-ip.ts            The caller's address, behind Vercel's proxy
      preview-visitor.ts      The signed-out visitor cookie — mint, read, hash
      cookie-names.ts         The two cookie names, importable from proxy.ts
      session.ts              Cookie and session table handling
      owner.ts                Whether the signed-in account is the site owner (pure, tested)
      require-owner.ts        THE gate in front of every /owner page and action
    owner/
      audited-action.ts      ownerAction() — requireOwner + parse/run + automatic audit log write
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
   and a question map for jumping between questions mid-test. The one
   remaining item of the original Phase 5 list, filter by difficulty, is not
   going to be built: the owner set it aside, then removed the feature
   outright. `difficulty` is gone from the schema, the question files, the
   database and the test screen — see the note in the conventions above.
   Phase 5 is therefore complete as scoped.
6. **Phase 6 — payments. Done.** A signed-in student may answer a fixed
   number of questions free on each aircraft (`FREE_QUESTIONS_PER_AIRCRAFT`);
   going past it needs a subscription. `/upgrade`'s "Subscribe" button starts
   a Stripe Checkout session for a monthly or a quarterly (every three
   months) Price; Stripe's own webhook (`/api/webhooks/stripe`) confirms it
   and keeps the `subscriptions` table current, one row per user rather than
   appended to. Verified end to end against a real Stripe test-mode account:
   a checkout with Stripe's `4242 4242 4242 4242` test card, a
   correctly-signed webhook accepted, and — after `extractCurrentPeriodEnd`
   fixed a field that had moved under this account's billing API behaviour,
   see the conventions above — the subscription actually recognised as
   active. Now also **live**: the account is activated, live Prices and a
   live webhook endpoint exist, and the deployment carries live keys — see
   the `tax_code` note in the conventions above for what live mode asked
   for that test mode never did, and "Known gaps" for exactly how far the
   live path has been proven. A second way in besides Stripe now exists
   too: `/redeem` spends a free-access gift code, minted by
   `npm run gift:generate` — see the note on `provider` in the conventions
   above.
7. **Phase 7 — owner console. Done.** Everything under `/owner` grew well
   past the four read-mostly pages Phase 6 shipped: accounts gained
   pagination, status filters and a per-account detail page (redemption
   history, activity, an owner-only note); gift codes became
   general-purpose license keys (bulk generation to 200, CSV export, max
   redemptions, expiry, disabling); a "report a problem" inbox
   (`question_reports`) reads student-flagged problems alongside the
   question's current text without ever writing to it; a read-only
   insights dashboard (`/owner/insights`) surfaces a signup funnel, access
   counts, a question-quality signal from `attempts`, and the most-flagged
   questions; and every mutating action across all of it is wrapped in
   `ownerAction`, which writes an entry to a new `audit_log` automatically
   — see the conventions above for all of this in detail. Explicitly out
   of scope, by design: editing a question's or an aircraft's own content
   from the website — every write in this phase lands in a table content
   does not own, and the content-file-and-deploy workflow is untouched.
   Impersonation ("view as user") was scoped out too: it would touch the
   session chokepoint every other feature depends on, for a nice-to-have
   the account detail page's own activity and redemption history already
   cover most of the need for.

Do not start a phase until the previous one works.

## Not in scope yet

An admin panel, images in questions, mobile apps. The data model must not
make these harder later, but none of them get built now.

(Payments and subscriptions were on this list until the owner asked for
them. What exists now is Phase 6 above: a free allowance per aircraft, a
Stripe Checkout session, and a webhook that turns a subscription on or off.
What is still not built: a way to manage or cancel a subscription from
inside this app — Stripe's own customer portal, or the receipt email it
sends, is the only way to do that today. It does not make payments not work,
but it is worth adding before this earns real revenue. Subscribing now
needs a confirmed email address; see the note on verification above.)

(Exam simulation was on this list until the owner asked for it. What exists
now is a mode that withholds the answers until the end, and a clock that is
held on the session row and cannot be reset by reloading. What is still not
built is an *invigilated* exam — one where the mode itself is enforced rather
than chosen, which would mean moving `mode` onto the session row too, the way
the clock already is. See the conventions above.)

Questions are authored as repository files. If questions ever need to be written
from inside the website, an admin panel gets added then — the `status`,
`version` and `media` fields exist so that path stays open.

**Flying Knowledge now has its own content tree, a third one beside
`aircraft`/`questions` and `classRatings`/`classQuestions`.**
`flyingKnowledgeSubjects`/`flyingKnowledgeQuestions` (`src/db/schema.ts`) are
the same shape `classRatings`/`classQuestions` already are, for the same
reason: a subject (POF today, and whatever follows it) is a genuinely separate
content type, so it gets its own pair of tables rather than a "kind" column
grafted onto either of the others. `content/flying-knowledge/<code>/` holds
one `subject.json` manifest plus a `questions/` folder, validated by
`src/content/flying-knowledge-schema.ts` and loaded by
`src/content/load-flying-knowledge.ts` — deliberate near-mirrors of the
class rating equivalents, the same way those already mirror the aircraft
ones. `db:seed` syncs this tree exactly as it syncs the other two: insert or
update by id, delete what the files no longer hold. **Adding a second
Flying Knowledge subject is a content-only job**, the same rule "many
aircraft, in two trees" states for a second aircraft — see the note there.
This is now proven, not just asserted: Principles of Flight (`POF`) was
added as `content/flying-knowledge/pof/` alone — a `subject.json` and
fifteen question files, 501 questions at first, rebuilt to
1,000 and then pruned to 569 — see the note on the POF bank in `content/README.md`) — with the only application-code change being the
same one-line addition to `lib/study-guide.ts`'s hand-kept set that any
aircraft's own study guide already needs (see the note on that file
above), exactly the way a second aircraft proves the rule. Human
Performance & Limitations (`HPL`) proves it a further time: `content/flying-knowledge/hpl/` alone, a `subject.json` and sixteen
question files, 346 questions — see the note on the HPL bank in
`content/README.md`. Meteorology (`MET`) is the third: `content/flying-knowledge/met/`
alone, a `subject.json` and twenty-nine question files, 1,400 questions,
plus its study guide and the same one-line additions to `lib/study-guide.ts`
and to `lib/atpl-subjects.ts` (code `MET` against 050) — see the note on
the MET bank in `content/README.md`. Radio Navigation (`RNAV`, 062) is the fourth:
`content/flying-knowledge/rnav/`, eighteen chapter files, 911 questions,
and `public/rnav-study-guide.html` — see the note on the RNAV bank in
`content/README.md` Air Law (`LAW`, 010) is the fifth:
`content/flying-knowledge/law/`, twenty-six chapter files (00–25), 1,740
questions, and `public/law-study-guide.html` — see the note on the Air Law
bank in `content/README.md`. Electrics & Electronics (`AGK`, 021) is the
sixth: `content/flying-knowledge/agk/`, sixteen chapter files, 1,000
questions, and `public/agk-study-guide.html`. `AGK` is the code for the
whole of ATPL 021, so the airframe/systems and powerplant books can later be
added to the same subject (topics prefixed "Electrics NN …" today) — see
the note on the Electrics bank in `content/README.md`. Operational Procedures
(`OPS`, 070) is the seventh: `content/flying-knowledge/ops/`, nineteen
chapter files, 986 questions, and `public/ops-study-guide.html`.
Communications (`COM`, 090, a code reserved in `lib/atpl-subjects.ts` and
`lib/study-guide.ts` before it had content) is the eighth:
`content/flying-knowledge/com/`, seven chapter files, 634 questions, and
`public/com-study-guide.html`. See the notes on both banks in
`content/README.md`. Mass & Balance (`MB`, 031) and Performance (`PERF`, 032)
are the ninth and tenth, both written from one supplied book that covers the
two subjects: `content/flying-knowledge/mb/` (ten chapter files, 410
questions) and `content/flying-knowledge/perf/` (eighteen chapter files, 772
questions), with `public/mb-study-guide.html` and
`public/perf-study-guide.html`. See the notes on both banks in
`content/README.md`. Instrumentation (`INST`, 022) is the eleventh:
`content/flying-knowledge/inst/`, thirty-eight chapter files, 1,713
questions, and `public/inst-study-guide.html` — see the note on the
Instrumentation bank in `content/README.md`.

The one thing that does not carry over from either of the other two trees:
**Flying Knowledge is free in full, not metered by the free-tier cap or
gated by a subscription**, decided ahead of any content existing and
unchanged now that POF, HPL and MET are its three subjects with
content. Every other
section's free allowance exists because the bank behind it is something a
student sits through once toward one exam, and the cap is what pays for
building more of it. Flying Knowledge is the opposite kind of content — air
law, meteorology, navigation, the material a pilot keeps reviewing rather
than passes once and leaves behind — and metering material like that would
work against the reason it exists. `flying-knowledge/[code]/test/actions.ts`
is where this is actually enforced by *absence*: unlike its type-rating and
class-rating equivalents, it never imports `db/subscriptions.ts` or
`db/preview.ts`, never computes a `remainingFree` or `allowanceKind`, and
`submitTest` never withholds part of the answer key (`withheld` is always
`null`). `flying-knowledge/[code]/page.tsx` always passes `TestBuilder` its
own documented "no cap" case (`remainingFree={null}`) rather than a computed
allowance. A signed-out caller is still rate limited via
`RATE_LIMIT_RULES.previewPerIp` (reusing `checkPreviewAllowed`/
`recordPreviewRequest` from the preview flow, with no `preview_attempts` row
ever written) — that protects the server from a scripted flood, the same
"protect the machine, not the product" reasoning `MAX_ANSWERS` already gives
elsewhere, and is never used to cap how much of the bank a visitor may see.

**The POF bank (Principles of Flight, Flying Knowledge's only subject) is
authored content, and the honesty lives here, not on the page.** Authored by the assistant as general aerodynamics
theory — not transcribed from the Principles of Flight book the owner
pointed at, or from any other textbook or syllabus, and not checked against
one. At the owner's instruction, nothing a student reads in this subject —
guide or question — names a book, school, regulator, question bank or
syllabus; the record of where it came from is kept in this file and
`content/README.md` only. It was rebuilt section by section to
1,000 compound, computational questions, then pruned to 569 at the owner's
instruction (this site is for pilots, and the removed questions were an
engineer's); each rebuilt section replaced its
file with new ids and never reused a retired one. See the note on the POF bank in
`content/README.md`, and "Known gaps, honestly" below.

**The HPL bank (`HPL`, Human Performance & Limitations, Flying Knowledge's
second subject) is the same kind of content as POF, held to the same
honesty, for the same underlying reason.** The owner pointed at a specific
book — CAE Oxford Aviation Academy's *Human Performance and Limitations*,
Book 8 of its ATPL Ground Training Series — but that book is a
copyrighted, commercially sold ground-school text, not source material
this product may transcribe from, closely paraphrase or lean on for
specific wording or worked examples, the same boundary POF already drew
around the Principles of Flight book the owner pointed at there. The
sixteen topics mirror that book's own chapter list (Safety Culture &
Error Models through CRM & Incident Reporting, skipping only its
Specimen Questions, Glossary and Index), because that structure is the
standard EASA ATPL 040 "Human Performance & Limitations" syllabus taught
broadly the same way across many ground schools, not an expression unique
to one textbook. Every question and the study guide were authored by the
assistant from general knowledge of that syllabus — physiological
mechanisms, standard figures and named models (the stages of hypoxia,
Reason's Swiss Cheese model, the Skill-Rule-Knowledge model, the five
hazardous attitudes, somatogyral and somatogravic illusions, and so on)
that are taught consistently across ICAO/EASA human-factors training
generally — not transcribed from the book's own prose, worked examples or
its own Specimen Questions chapter, and not checked against it question by
question. At the owner's instruction, following the POF precedent exactly,
nothing a student reads in this subject — guide or question — names a
book, school, regulator, question bank or syllabus; the record of where
the topic structure came from is kept in this file and
`content/README.md` only. 346 questions across sixteen topics, all
published. See the note on the HPL bank in `content/README.md`, and
"Known gaps, honestly" below.

**The MET bank (`MET`, Meteorology, Flying Knowledge's third subject) is
the same kind of content again, under the same rule.** This time the owner
bought the book and supplied it: CAE Oxford Aviation Academy's
*Meteorology*, Book 9 of its ATPL Ground Training Series. Their instruction
was to use it for the information only, not its content or the way it is
written. That is the boundary POF and HPL already drew. The twenty-nine
topics follow its chapter order (the standard EASA ATPL 050 syllabus).
Every question, every coded report example and the study guide were
written by the assistant from the facts, and the specimen-question
chapters were not used. The student-facing pages name no source.
1,400 questions, all published, with distractors rewritten until option
length no longer gives the answer away. See the note on the MET bank in
`content/README.md`.

## Known gaps, honestly

- **A signed-out visitor's preview is metered by a cookie, which they can
  throw away.** It used to be metered by nothing at all — see "A signed-out
  visitor gets a preview" in the conventions above for what that cost. What
  bounds a caller who drops the cookie is `RATE_LIMIT_RULES.previewPerIp`,
  and that is a limit on rate, not on total: forty signed-out answers per
  address per fifteen minutes still adds up to the whole bank given a day
  and a patient script. Closing that completely means requiring an account
  to practise at all, which is the trade "Practice does not require an
  account" below still declines to make.
- **A question merely shown is not distinguished from one answered.** The
  size cap on a freshly built test (see the conventions above) stops a
  single test from handing a free account more than its remaining allowance,
  but nothing records that a question was *displayed* short of being
  answered — only `attempts` does that. A student who starts and abandons
  several tests without answering could see more than
  `FREE_QUESTIONS_PER_AIRCRAFT` distinct questions across those separate
  visits, each individually within the cap. Closing this needs tracking
  exposure on its own, which is deliberately not built — see the note on
  `attempts` being the only usage counter, above.
- **A gift code's `unlocks_aircraft_code` is recorded, not enforced.**
  Redeeming a code with an aircraft set still grants full access to every
  aircraft — see "Gift codes are now general-purpose license keys" above
  for why, and what wiring it up for real would touch.
- **The signup funnel's paywall stage only counts hits since `paywall_hits`
  was added.** `answerQuestion`'s `"paywall"` branch previously wrote
  nothing at all; the insights dashboard's "hit the paywall" figure is
  therefore accurate from this phase onward but has no history to draw on
  for accounts that hit the limit before it existed.
- **Live mode has taken a real payment, end to end.** A real card was
  charged (`succeeded`, `livemode: true`), the subscription came back
  `active` carrying the `userId` and `plan` metadata and a period end a
  month out, and Stripe reported `pending_webhooks: 0` — every endpoint,
  this app's included, took the `customer.subscription.created` event. The
  same run also exercised the unhappy path by accident and passed it: an
  earlier attempt on a card with no funds produced a **failed** charge and
  granted nothing, which is `mapStripeSubscriptionStatus` behaving exactly
  as documented, confirmed against real money rather than a fixture.

  The one thing that first payment got wrong was the *price* — see the
  `tax_behavior` note in the conventions above. Fixed, but the fix is why
  live mode is worth watching rather than assuming.
- **2Checkout was tried first and declined the merchant application before
  any code could be tested against it.** Nothing about that attempt is left
  in the code; it is mentioned here only so the choice of Stripe is not
  mistaken for the original plan.
- **A mid-test page refresh restarts the test — for a signed-out visitor.**
  Nothing is recorded for them, so there is nothing to resume from; a refresh
  simply draws a fresh random set, same as visiting the test page for the
  first time. A signed-in student does not have this problem any more — see
  the note on `answerQuestion` and `?t=` in the conventions above.
- **`order by random()`** picks test questions. Correct and fast for banks of
  this size; revisit if a bank ever reaches hundreds of thousands of questions.
- **The whole DA40 bank is now sourced from the DA 40 D AFM (TAE 125 engine,
  Doc. # 6.01.05-E, Revision 6/7).** This replaces the earlier state, where
  only `Fuel System` was owner-sourced and `Powerplant` described a piston
  engine on AVGAS that contradicted the diesel variant. Every question now
  carries a `reference` to the AFM chapter/section it was drawn from. One
  table was deliberately left unused as a source of exact figures: the
  maneuvering load factors in AFM 2.10 print without decimal points in the
  source document itself (confirmed by rendering the actual page, not just
  the text extraction), so no numeric MCQ was built on it rather than
  guessing where the decimal belongs. See `content/README.md`.
- **A study guide is a static file, and has to live where the app actually
  serves static files — and "checking whether one exists" cannot be an
  `fs` call against that folder either, on Vercel.** Two rounds, both only
  caught by opening the deployed page rather than trusting that a merged PR
  was a shipped feature:

  1. The DA40 study guide first shipped inside `content/classes/da40/`,
     which is never read by anything but `db:seed` — it validated, it
     committed, and it was completely invisible on the live site, because
     nothing under `content/` is served to a browser. Moved to
     `public/da40-study-guide.html`, where Next.js actually serves it.
  2. `studyGuideHref()` in `src/lib/study-guide.ts` then checked for that
     file with `existsSync(path.join(process.cwd(), "public", …))` — which
     works in local dev and in a local `next build && next start`, and is
     silently false in Vercel's actual deployment: the Node.js serverless
     function that renders the overview page does not have `public/` on its
     filesystem at all, because those files are served by Vercel's static
     asset layer directly and are never bundled into the Lambda. The guide
     loaded perfectly at its own URL while the link meant to point at it
     never rendered, on the same deployment, at the same time — proof that
     a file being served correctly says nothing about whether server-side
     code in the same app can see it on disk.

  `studyGuideHref()` now checks a small hand-kept `Set` of codes instead of
  the filesystem. Adding a guide for the next aircraft is still "drop the
  file in `public/`" — plus one line adding its code to that set, which is
  what makes the app know the file is there rather than assuming it can ask
  the filesystem at request time.

  The DA40 guide itself was first drafted in Arabic before being translated
  to English, matching the rule at the top of this file that all
  user-facing content is English. `public/da40-study-guide-ar.html` keeps
  that Arabic draft on disk rather than discarding it, for a possible
  future translated edition of the product — it is reachable at its own
  URL exactly like the English one, but `studyGuideHref()` never returns
  it and nothing in the app links to it.
- **The entire POF bank (Principles of Flight, Flying Knowledge's only
  subject) was authored by the assistant, not transcribed from the
  Principles of Flight book the owner pointed at, or from any other
  textbook, syllabus or question bank, and not checked against one.**
  It sticks to general aerodynamic relations and standard-atmosphere
  values, computed rather than copied, and should be reviewed by a
  qualified instructor before a student relies on it for a real exam.
  The study guide does not say so on the page: the
  owner asked for every source mention to be removed from what a student
  reads, so this note and `content/README.md` are now the only place the
  caveat is recorded. See the note on the POF bank in `content/README.md`.
- **The entire HPL bank (Human Performance & Limitations, Flying
  Knowledge's second subject) was authored by the assistant, not
  transcribed from the CAE Oxford Aviation Academy ATPL textbook the owner
  pointed at, or from any other textbook, syllabus or question bank, and
  not checked against one.** Its sixteen topics follow that book's own
  chapter structure because that structure is the standard EASA ATPL 040
  syllabus, not a copyrightable feature of the one textbook — but every
  question, explanation and the study guide are independently written from
  general knowledge of standard, widely-taught human-factors concepts
  (hypoxia physiology, vestibular illusions, stress and error models, CRM),
  not copied or paraphrased from the book's own prose, worked examples or
  its Specimen Questions chapter. As with POF, the study guide and
  questions name no book, school, regulator or syllabus on the page, at the
  owner's instruction; this note and `content/README.md` are the only
  record of where the topic structure came from. It should be reviewed by
  a qualified instructor before a student relies on it for a real exam.
  See the note on the HPL bank in `content/README.md`.
- **The entire MET bank (Meteorology, Flying Knowledge's third subject,
  1,400 questions) was authored by the assistant from a copy of the CAE
  Oxford Aviation Academy ATPL meteorology textbook that the owner bought
  and supplied, using it for the facts only, at the owner's own
  instruction: not its wording, worked examples or specimen questions.**
  The twenty-nine topics follow the book's chapter order, which is the
  standard EASA ATPL 050 syllabus. Every question, every METAR, TAF and
  SIGMET example, every calculation and the study guide are original.
  Nothing a student reads names a book, school, regulator or syllabus,
  following the POF and HPL precedent. It has not been checked question by
  question against the book or any other syllabus, and should be reviewed
  by a qualified instructor before a student relies on it for a real exam.
  See the note on the MET bank in `content/README.md`.
- **The RNAV bank (Radio Navigation, 911 questions in eighteen chapters)
  was authored by the assistant from the CAE Oxford Aviation Academy ATPL
  Radio Navigation textbook the owner bought and supplied, for its facts
  only — not its wording or its questions.** It replaced an earlier
  382-question bank that named the source and copied stems; see the note
  on the RNAV bank in `content/README.md`. Topics carry chapter numbers so
  they list in order. Nothing a student reads names a book, school,
  regulator or syllabus. It should be reviewed by a qualified instructor.
- **The A320 bank (type rating, 751 questions, by FCOM chapter) is checked
  against open sources, not against an FCOM.** Its facts come from the public
  FlyByWire A32NX documentation (an A320neo simulation's docs); nothing was
  transcribed from the copy-protected third-party PDF the owner first supplied,
  and its drawings were not reproduced. At the owner's instruction no student-
  facing text names the source: every question's `reference`, the study guide
  and the aircraft description instead tell the student it is for study only
  and to verify against their operator's FCOM. Chapters 20, 38, 45 and 46 are
  not covered and 25, 35 and 52 are thin. The owner is reviewing every
  question. See "The A320 bank" in `content/README.md`.
- **Twenty-six B737 questions turn on a figure nobody has confirmed twice.** The
  bank's wrong options were rewritten so a question cannot be answered by
  elimination alone, and that pass deliberately left every uncorroborated number
  and its option band exactly as authored rather than inventing plausible
  neighbours around it. Three of them disagree with a published source outright
  — the seating capacity, the tail height and the cockpit voice recorder
  duration — and are waiting on an owner's decision, not a quiet edit. The list
  and its sources are in `content/README.md`.
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
- **An aircraft's code can move between the type rating and class rating
  trees without becoming a new aircraft.** The DA40 did exactly this —
  `content/da40/` (an `aircraft.json`, rows in `aircraft`/`questions`) became
  `content/classes/da40/` (a `class.json`, rows in
  `class_ratings`/`class_questions`) — and `DA40` never changed, because
  nothing downstream of a question id cares which tree owns the code: not
  `attempts.aircraft_code`, not a question's own id prefix, not a flag or a
  note. This is a smaller move than the display-name-only rule above
  suggests it might be, and it is safe for exactly the reason "many
  aircraft, in two trees" gives — the two content trees are a split in
  where an aircraft is authored and served from, not a split in what an
  aircraft *is* to the rest of the schema.
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

- **Nothing sweeps the housekeeping tables.** `sweepExpiredSessions()`,
  `sweepLoginAttempts()`, `sweepExpiredResetTokens()` and
  `sweepExpiredVerificationTokens()` all exist and are
  correct, but nothing calls them.
  Expired rows are ignored when reading, so this is tidiness rather than
  correctness. A scheduled job can call them later.
- **The limiter does not stop a distributed attack.** Thousands of addresses
  each trying a few passwords from leaked credential lists would stay under
  both thresholds. Defending that needs rejecting known-breached passwords or a
  second factor — neither is needed at this size, but neither comes free with
  what is built here.
- **Practice does not require an account — but it is now a preview, not the
  whole bank.** Deliberate, and narrowed: signing out must not take the
  question bank away entirely, so a visitor may sit a short test and be
  shown its answers. Signed-out tests are still graded and recorded nowhere,
  and the result screen still says so. What changed is the size: see "A
  signed-out visitor gets a preview" in the conventions above. Requiring a
  login to practise at all would still be a one-line guard in the test page
  if the owner ever wants it — but it trades away everyone who wants to try
  the site before committing.
- **Signing in does not return you where you were.** `/progress` sends a signed-out
  visitor to `/login`, which then lands them on the home page. A `?next=` parameter
  would fix it, and must only ever accept a relative path or it becomes an open
  redirect.
- **The progress chart plots the last 100 tests and no more.** Fine now; a date
  filter is the honest answer once anyone exceeds that.
- **The Air Law bank has not been reviewed by an instructor, and air law
  dates fast.** It was written from a supplied textbook, with dated figures
  replaced by current ones where known (see the Air Law note in
  `content/README.md`), but rules change between editions and between
  States. Treat it as revision material until a qualified instructor has
  checked it against the current regulations.
- **The Operational Procedures bank (OPS, 986 questions) and the
  Communications bank (COM, 634 questions) have not been reviewed by an
  instructor.** Both were written from the owner's supplied textbooks for
  their facts only, with dated points replaced by current values (see
  `content/README.md`). The OPS all-weather tables — low visibility take-off,
  take-off RVR by facilities, CAT II RVR by DH, circling minima — follow the
  book and may differ from the 2022 revision of the all-weather rules; they
  need checking against the current regulations.
- **The Mass & Balance bank (MB, 410 questions) and the Performance bank
  (PERF, 772 questions) have not been reviewed by an instructor.** Both were
  written from the owner's supplied textbook (one book for both subjects) for
  its facts only — not its wording, worked examples, revision or specimen
  questions — and its graph data sheets are not in the text, so calculations
  use original numbers rather than chart readings (see `content/README.md`).
  The performance factors and gradients follow the book and should be checked
  against the current regulations.
- **The Instrumentation bank (INST, 1,713 questions) has not been reviewed
  by an instructor.** It was written from the owner's supplied textbook for
  its facts; the book's own questions were used only as a coverage checklist
  and a style guide, never copied (see `content/README.md`). The supplied
  text is missing many figure pages, filled from standard knowledge. Treat it
  as revision material until a qualified instructor has checked it.
- **The Electrics & Electronics bank (AGK, 1,000 questions) has not been
  reviewed by an instructor.** It was written from the owner's supplied
  textbook for its facts only (the book's questions not used, its errors
  left out — see `content/README.md`). Treat it as revision material until
  a qualified instructor has checked it.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
