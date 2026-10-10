# PilotQBank (pilotqbank.com) — Project Brief

Handoff document for a Claude Project. Source of truth for the detailed rules is `CLAUDE.md` in the repo (yusurwahab-source/aviation-qbank); upload it to the project too. This brief is the short version.

## 1. What it is
A web app where student pilots practise multiple-choice questions. All user-facing content is **English**. The goal is **understanding the aircraft/subject, not memorising questions**: every wrong option must be ruled out by knowing the system. A question that can only be answered by having seen it before is a bug.

Brand: **PilotQBank**. Name/tagline/URL live only in `src/config/site.ts`.

## 2. Product structure (3 pillars over 4 sections)
Landing page and header show three pillars:
1. **EASA ATPL Ground School** = the Flying Knowledge section (`/atpl-ground-school`, tests at `/flying-knowledge/<code>`). Free in full, never behind the cap or subscription. Lists 14 EASA ATPL theory subjects from a static list (`lib/atpl-subjects.ts`); live ones: **POF** (080, 569 q), **HPL** (040, 346 q), **MET** (050, 1,400 q).
2. **Aircraft Systems Knowledge** (`/aircraft-systems`, thin chooser) = two separate trees:
   - **Type Rating** `/type-rating` (large aircraft): **B737** (-800 bank, ~802 q), **A320** family (751 q).
   - **Class Rating** `/class-rating` (light aircraft, no single/multi split): **DA40** (DA 40 D TDI, AFM-sourced), **C152**, **DA42**.
3. **Pilot Sims & Flight Trainers** `/pilot-sims`: standalone simulators in `public/pilot-sims/` shown in a sandboxed iframe (Holding Pattern Entry Trainer, VOR/NDB trainer). Free for all; internals are not edited from the repo. `tier` is display only ("Premium soon").

Plus **Logbook Scanner** `/tools/logbook`: photograph a paper EASA logbook spread -> Claude (Anthropic API, `LOGBOOK_MODEL`, default claude-sonnet-5-5) transcribes -> deterministic validation (`lib/logbook/validate.ts`) -> editable review, totals, CSV/XLSX/JSON/PDF export. Photos are never stored. 2 free spreads, then a credit (40 spreads); €4.99 flag exists but no payment provider connected.

## 3. User flow
Choose aircraft -> build a test (any sections, any number of questions, presets: all systems, my weak systems, flagged, got wrong, unseen) -> sit it in:
- **Study mode** (default): each answer marked immediately with explanation, untimed (count-up clock), question then settles.
- **Exam mode**: nothing shown until the end; 1 minute per question; auto-submits at zero; clock stored in DB (`test_sessions.startedAt`/`timeLimitSeconds`) so refresh can't reset it.
Result screen: pass/fail (owner-set pass mark), time, per-system breakdown, 2 weakest systems, exactly three actions (retake wrong, new test on weakest, dashboard).
Signed-in students: answers saved as given (abandoned tests count, refresh/return resumes via `?t=`), "Resume your test" banner, flags and autosaving private notes, `/progress` reports (overall, by topic, over time, retry list), keyboard shortcuts, swipe on mobile, question map.

## 4. Access / payments
- Signed-out: small preview (5 questions, counted server-side by hashed cookie + per-IP rate limit).
- Signed-in free: fixed free allowance per aircraft (owner-editable setting, counted from `attempts`). Past it -> `/upgrade`.
- Subscription via **Stripe Checkout** (monthly / quarterly Prices), confirmed by webhook `/api/webhooks/stripe` (signature-verified). Live mode verified with a real payment. Prices are tax-inclusive; Products need `tax_code txcd_20060058`. No Stripe SDK; plain `fetch`.
- Email must be confirmed before subscribing.
- Gift codes / license keys (`/redeem`, minted at `/owner/gift-codes` or `npm run gift:generate`), extend-only.
- Flying Knowledge and Pilot Sims are always free.
- Not built: in-app subscription management (Stripe portal only), invigilated exams, aircraft-scoped access.

## 5. Accounts and security
Sign up/log in/out, password reset by emailed one-time link, change password at `/account`, email verification, unsubscribe from owner broadcasts. scrypt hashing, DB-backed sessions (SHA-256 of cookie stored), DB-backed rate limits, no account enumeration. Email via Resend (`RESEND_API_KEY`, `EMAIL_FROM`) or server log fallback.
The **answer key never ships in the page**; it only returns per answered question. Reports always filter by `userId`.

## 6. Owner console `/owner` (one email, `OWNER_EMAIL`; others get 404)
Overview, Insights (funnel, quality signals), Accounts (+detail, grant/revoke, notes), Subscribers, Gift codes, Reports inbox (question problems), Aircraft requests, Messages (broadcast email queue with unsubscribe), Settings (free cap, preview cap, banner, pass mark, hide/rename sections and items), Audit log (every mutation via `ownerAction`), Logbook usage. Owner can hide/rename, never delete or recode content.

## 7. Tech stack
Next.js 16 (App Router, TypeScript; **breaking changes vs older versions: read `node_modules/next/dist/docs/` before coding**; `proxy.ts` replaces `middleware`), Postgres + Drizzle ORM (Neon/Supabase compatible), Tailwind v4, Zod, Vitest, Vercel. Fonts: Space Grotesk (UI), Inter (question text), self-hosted via next/font. Charts are inline SVG. No charting/auth/Stripe/email libraries.

Design: "Aviation Classic" palette, dark default plus light theme; **every colour/size/radius is a token in `src/app/globals.css`, never hardcoded in `src/`**. Yellow `#FBC02D` is a fill, `text-brand-ink` for text. 44px tap targets, works to 375px. Service worker caches static assets only, never documents.

## 8. Content model (content is the source of truth)
- Type rating: `content/<code>/` (aircraft.json + questions/*.json) -> `aircraft`, `questions`
- Class rating: `content/classes/<code>/` (class.json) -> `class_ratings`, `class_questions`
- Flying Knowledge: `content/flying-knowledge/<code>/` (subject.json) -> `flying_knowledge_subjects`, `flying_knowledge_questions`
- Schemas in `src/content/*schema.ts`. Question fields: id (`AIRCRAFT-TOPIC-NNNN`), aircraft, topic, subtopic?, question, options (2–5), correct, explanation, reference?, media?, tags?, status (`draft`/`published`; only published shown), version. Unknown fields fail the build.
- `db:seed` inserts/updates/**deletes** to match files. Never edit questions in the DB.
- **Adding an aircraft or subject must be content-only** (plus one line in `lib/study-guide.ts`, and `lib/atpl-subjects.ts` for ATPL subjects). Study guides: `public/<code>-study-guide.html`.
- `attempts` has no FK to questions on purpose, so content edits never rewrite history. Aircraft codes must never change (URL, id prefix, history).
- Legacy redirects: `/aircraft`, `/class`, `/aviation-knowledge`.

## 9. Commands
`npm run setup` (migrate + seed), `dev`, `build`, `check` (validate + lint + typecheck + test; run before pushing), `db:migrate`, `db:seed`, `db:generate`, `validate:content`, `gift:generate`, `icons:generate`. Deploy = Vercel running `vercel-build` (migrate, seed, build); pushing to `main` publishes content. Custom `scripts/migrate.ts` (hash-based) replaces drizzle's `migrate()`. Config is read through `readEnv` in `src/lib/env.ts`. One feature per session, one PR per feature, `main` always works.

## 10. Content honesty / known gaps
- POF, HPL, MET banks were authored by the assistant from general knowledge (HPL/MET topic order follows CAE Oxford ATPL books, used for facts only, never transcribed). Nothing student-facing names a book/regulator/syllabus. Needs qualified-instructor review before exam reliance.
- A320 bank checked against open sources (FlyByWire docs), not an FCOM; students are told to verify with their operator's FCOM. Chapters 20, 38, 45, 46 missing.
- 26 B737 questions rest on unconfirmed figures; 3 contradict published sources (seats, tail height, CVR duration) pending owner decision (`content/README.md`).
- Signed-out preview can be bypassed by dropping the cookie (rate-limited only); "shown vs answered" isn't tracked; gift-code `unlocks_aircraft_code` isn't enforced; housekeeping sweep functions are never scheduled; no `?next=` after login; progress chart caps at last 100 tests; a mail provider is required in production for reset/verify emails.

## 11. Working rules for Claude
Follow `CLAUDE.md` (keep it current when behaviour changes). Do not create PRs unless asked. Don't hardcode colours or the product name. Don't edit pilot-sim internals. Run `npm run check` before pushing.
