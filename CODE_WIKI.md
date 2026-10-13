# Code Wiki

## 1. Project Summary

This repository is a content-driven aviation learning platform built with Next.js, TypeScript, Postgres, and Drizzle ORM.

The product combines:

- practice question banks for aircraft type ratings
- class rating study banks
- ATPL / flying knowledge study banks
- user accounts, resumable tests, and progress reporting
- paid access via Stripe and gift codes
- owner/admin tooling for reports, settings, broadcasts, and subscriber management
- a Logbook Scanner feature that uses Anthropic Claude to extract structured logbook data from uploaded images

The architecture is intentionally split so that:

- repository JSON content is the source of truth for question banks
- database tables store runtime state and published content
- business rules live in `src/lib`
- persistence logic lives in `src/db`
- routes and page composition live in `src/app`

This is mostly a function-oriented codebase, not an object-oriented one. Aside from `MissingDatabaseUrlError` in `src/db/index.ts`, the main reusable units are React components, server actions, route handlers, and plain TypeScript functions.

## 2. Technology Stack

### Core Stack

- Next.js 16 with the App Router
- React 19
- TypeScript 5
- Postgres
- Drizzle ORM and Drizzle Kit
- Tailwind CSS v4
- Zod for content and payload validation
- Vitest for tests

### External Integrations

- Stripe for subscription checkout and webhook-based subscription sync
- Resend-compatible email transport for password reset, verification, and broadcasts
- Anthropic Claude for logbook page extraction

### Tooling

- `npm` as the package manager
- `tsx` for TypeScript scripts
- ESLint for linting
- `tsc --noEmit` for type checking

## 3. Top-Level Repository Map

| Path | Responsibility |
| --- | --- |
| `src/app` | Next.js routes, layouts, server actions, API handlers, and page composition |
| `src/components` | Shared UI and reusable client/server React components |
| `src/lib` | Core business logic, policies, helpers, external service adapters |
| `src/db` | Drizzle schema, DB connection management, queries, mutations, reporting |
| `src/content` | Loaders and schemas for repository-authored content |
| `content` | Source question-bank data for aircraft, class ratings, and flying knowledge |
| `scripts` | Migration, seeding, validation, icon generation, gift code generation |
| `drizzle` | SQL migrations and Drizzle metadata |
| `tests` | Vitest coverage for business logic, DB modules, and content behavior |
| `public` | Static assets, PWA assets, study guides, and simulator HTML pages |
| `.github/workflows` | CI automation for validation, tests, and build |

## 4. Runtime Architecture

### High-Level Flow

```text
Repository content JSON
  -> src/content loaders and Zod schemas
  -> scripts/seed.ts
  -> Postgres tables in src/db/schema.ts
  -> src/db query and mutation modules
  -> src/lib business rules and policies
  -> src/app pages, server actions, and API routes
  -> React UI in src/components
```

### Request Lifecycle

For a typical study flow:

1. A page route in `src/app` loads user state and content summaries.
2. The route calls `src/db` readers such as `listTopics()`, `getAircraft()`, or report queries.
3. The page renders shared UI and hands interactive behavior to client components such as `TestBuilder` or `TestRunner`.
4. Client components call server actions such as `answerQuestion()` or `submitTest()`.
5. Server actions enforce authentication, entitlement, and rate-limiting rules using `src/lib`.
6. The server action records or reads state via `src/db`.
7. The UI updates with grading results, progress, flags, notes, or retry suggestions.

### Architectural Traits

- content-first publishing: question banks are authored as JSON files and synced into the DB
- server-first data access: most privileged logic runs in server actions and route handlers
- clear separation of concerns: `app` for orchestration, `lib` for logic, `db` for storage
- minimal class usage: logic is primarily expressed as functions and typed objects
- shared cross-tree behavior: aircraft, class rating, and flying knowledge all reuse the same broad study patterns

## 5. Application Layer: `src/app`

`src/app` is the route and feature orchestration layer.

### Global Shell

- `layout.tsx` defines the root HTML shell, metadata, viewport, header, footer, banners, upgrade prompt, and service worker mounting
- `page.tsx` is the marketing/home entry point and composes landing sections from `src/app/_landing`
- `globals.css`, `fonts.ts`, `manifest.ts`, `robots.ts`, and `sitemap.ts` provide app-wide styling and site metadata

### Major Route Groups

| Route Area | Purpose |
| --- | --- |
| `src/app/(auth)` | signup, login, logout, password reset, email verification |
| `src/app/account` | profile, password change, verification resend, message preferences |
| `src/app/type-rating` | aircraft picker, aircraft detail page, test taking |
| `src/app/class-rating` | class rating picker, detail page, test taking |
| `src/app/flying-knowledge` and `src/app/atpl-ground-school` | ATPL subject discovery and test flows |
| `src/app/progress` | learner progress dashboards and scoped reports |
| `src/app/upgrade` and `src/app/redeem` | subscription checkout and gift-code redemption |
| `src/app/tools/logbook` | logbook list, save/unlock flows, scanned page review |
| `src/app/pilot-sims` | simulator/tool landing pages |
| `src/app/owner` | owner/admin console for operations and support |
| `src/app/api` | server route handlers for Stripe, unsubscribe, and logbook extraction |

### Important Server Actions

These are some of the most important write-side entry points in the application:

| File | Key Functions | Responsibility |
| --- | --- | --- |
| `src/app/(auth)/actions.ts` | `signUp`, `logIn`, `logOut`, `requestPasswordReset`, `resetPassword`, `confirmEmail` | authentication and account recovery |
| `src/app/type-rating/[code]/test/actions.ts` | `answerQuestion`, `submitTest`, `toggleFlag`, `saveNote`, `loadNote`, `reportQuestion` | core study/test workflow for aircraft |
| `src/app/class-rating/[code]/test/actions.ts` | same pattern as aircraft actions | class rating study flow |
| `src/app/flying-knowledge/[code]/test/actions.ts` | same pattern as aircraft actions | ATPL/flying knowledge study flow |
| `src/app/upgrade/actions.ts` | `startCheckout` | Stripe checkout creation |
| `src/app/redeem/actions.ts` | `redeem` | gift code redemption |
| `src/app/tools/logbook/actions.ts` | `startLogbook`, `unlockLogbookAction`, `saveLogbookAction`, `deleteAllLogbookDataAction` | saved logbook lifecycle |
| `src/app/owner/messages/actions.ts` | `sendBatch` | owner broadcast delivery loop |

### API Route Handlers

| File | Method | Responsibility |
| --- | --- | --- |
| `src/app/api/webhooks/stripe/route.ts` | `POST` | verifies webhook signatures and syncs subscription status |
| `src/app/api/logbook/extract/route.ts` | `POST` | validates uploads, enforces limits, calls Claude extraction, records usage |
| `src/app/api/unsubscribe/route.ts` | `GET` / `POST` | processes unsubscribe links and opt-out actions |

## 6. UI Layer: `src/components`

`src/components` holds the reusable UI building blocks used by route pages.

### Core UI Primitives

- `ui.tsx` exports structural UI primitives such as `PageHeading`, `Card`, `Badge`, `ScoreBar`, and `EmptyState`
- `site-header.tsx`, `site-footer.tsx`, `mobile-nav.tsx`, and `user-menu.tsx` drive navigation
- `database-unavailable.tsx` provides graceful fallback rendering when DB access fails

### Practice Test Components

The most important interactive components live in `src/components/practice-test`.

| Component | Responsibility |
| --- | --- |
| `TestBuilder` | selects topics, presets, question counts, and mode before starting a test |
| `TestRunner` | drives one-question-at-a-time study/exam flow, timers, notes, flags, reporting, and result transition |
| `ResultScreen` | renders final outcomes and retry guidance |
| `QuestionNav` | jump navigation across questions |
| `ShortcutsOverlay` | documents keyboard shortcuts |

### Notable Cross-Cutting Components

- `progress-report.tsx` renders summary stats, weakest topics, and trend reporting
- `resume-test-banner.tsx` surfaces resumable sessions
- `upgrade-prompt.tsx` and `upgrade-prompt-dialog.tsx` handle monetization prompts
- `verify-email-banner.tsx` and `verify-email-notice.tsx` keep verification state visible
- `service-worker.tsx` wires in service worker behavior

## 7. Business Logic Layer: `src/lib`

`src/lib` contains policies, domain rules, and third-party integration code. This is the main non-UI logic layer.

### Auth and Session Modules

| Module | Key Functions | Responsibility |
| --- | --- | --- |
| `src/lib/auth/session.ts` | `createSession`, `getCurrentUser`, `destroySession`, `destroyAllSessions`, `sweepExpiredSessions` | secure session creation, lookup, renewal, and cleanup |
| `src/lib/auth/credentials.ts` | `normaliseEmail` | auth input normalization |
| `src/lib/auth/reset-policy.ts` | `resetTokenState`, `resetExpiryFrom`, `withMinimumDuration` | password reset timing and state rules |
| `src/lib/auth/verification-policy.ts` | `verificationExpiryFrom` | email verification token policy |
| `src/lib/auth/require-owner.ts` | `requireOwner` | owner-only route protection |
| `src/lib/auth/rate-limit-policy.ts` | `decide`, `combine`, `describeWait` | reusable rate-limit decision logic |
| `src/lib/auth/preview-visitor.ts` | `ensurePreviewVisitorId` | anonymous preview visitor identity |

### Billing and Access Control

| Module | Key Functions | Responsibility |
| --- | --- | --- |
| `src/lib/billing/access-policy.ts` | `hasActiveSubscription`, `remainingFreeQuestions`, `canAnswerQuestion`, `mapStripeSubscriptionStatus` | free-tier and paid-access rules |
| `src/lib/billing/stripe.ts` | `parseCheckoutPlan`, `buildCheckoutSessionBody`, `createCheckoutSession` | Stripe checkout request construction |
| `src/lib/billing/stripe-webhook.ts` | `verifyStripeSignature` | webhook request authentication |
| `src/lib/billing/gift-codes.ts` | `generateGiftCode`, `normalizeGiftCode`, `computeGiftPeriodEnd` | gift code formatting and lifecycle helpers |

### Practice and Reporting Logic

| Module | Key Functions | Responsibility |
| --- | --- | --- |
| `src/lib/test-options.ts` | `parseTestMode`, `parseTestLength`, `parseTopics`, `resolveTestSize`, `timeLimitFor`, `buildTestHrefFor` | URL/state contract for test creation and timing |
| `src/lib/grading.ts` | `gradeTest`, `percentage`, `withholdAnswerKey` | scoring and answer-key shaping |
| `src/lib/question-status.ts` | `questionStatus`, `unansweredCount`, `nextUnansweredIndex` | test-progress state helpers |
| `src/lib/settings.ts` | `parseSettings`, `validateSettings`, `settingsToRows`, `sectionTitle` | typed site settings and per-item overrides |

### Email and Broadcast Logic

| Module | Key Functions | Responsibility |
| --- | --- | --- |
| `src/lib/email/send.ts` | `appUrl`, `emailIsConfigured`, `sendEmail` | email transport boundary |
| `src/lib/email/reset-email.ts` | `resetEmail` | reset email template |
| `src/lib/email/verification-email.ts` | `verificationEmail` | verification email template |
| `src/lib/email/password-changed-email.ts` | `passwordChangedEmail` | password change notification template |
| `src/lib/broadcast/compose.ts` | `composeBroadcastEmail`, `escapeHtml` | broadcast message rendering |
| `src/lib/broadcast/send-batch.ts` | `sendNextBatch` | owner email batch dispatch |
| `src/lib/broadcast/audience.ts` | `isAudience` | audience validation |

### Logbook Scanner

The Logbook Scanner is its own subsystem inside `src/lib/logbook`.

| Module | Key Functions | Responsibility |
| --- | --- | --- |
| `claude.ts` | `extractLogbookPage` | Claude API invocation and structured extraction |
| `extraction.ts` | `formatProblems`, `normalizeExtractedPage` | transform model output into app data |
| `validate.ts` | `validateLogbook`, `computeRunningTotals`, `applyFix`, `setCell` | consistency checks and suggested fixes |
| `summary.ts` | `summarize`, `paperCorrections` | logbook rollups and summaries |
| `entitlement.ts` | `decideExtraction`, `spreadsRemaining`, `availableUnlocks`, `pickUnlockSource` | free vs paid scan entitlement rules |
| `time.ts` | `parseDuration`, `formatDuration`, `parseClock`, `parseLogDate` | aviation/logbook time parsing helpers |
| `pricing.ts` | `costMicroUsd`, `formatMicroUsd` | cost calculation for extractions |
| `image-type.ts` | `sniffImageType` | uploaded image type detection |
| `export/*` | `toCsv`, `toJson`, `toPdf`, `toXlsx`, `zipStore` | export formats for saved logbooks |

### Small but Important Utility Modules

- `src/lib/env.ts` centralizes environment variable reading
- `src/lib/canonical-url.ts` builds the base site URL for metadata and email links
- `src/lib/keyboard-shortcuts.ts` defines answer-selection shortcut behavior
- `src/lib/study-guide.ts` links content codes to generated study guide pages
- `src/lib/seo/sitemap-entries.ts` builds site map entries

## 8. Persistence Layer: `src/db`

`src/db` owns the Postgres boundary.

### Connection Management

- `src/db/index.ts` creates the shared Postgres pool and Drizzle instance
- `getPool()` caches one `pg.Pool` on `globalThis`
- `getDb()` exposes the typed Drizzle database handle
- `MissingDatabaseUrlError` is the primary explicit class in the codebase

### Schema Design

`src/db/schema.ts` is the structural backbone of the application.

It defines:

- content tables for aircraft, class ratings, flying knowledge subjects, and their question tables
- user/account tables for users, sessions, password reset tokens, and email verification tokens
- study state tables for test sessions, attempts, flags, and notes
- billing tables for subscriptions, gift codes, gift code redemptions, and paywall hits
- support tables for login attempts, preview attempts, aircraft interest, settings, reports, and audit logs
- messaging tables for broadcasts and delivery rows
- logbook tables for saved logbooks, extraction usage, and logbook credits

### Key Query/Mutation Modules

| Module | Responsibility |
| --- | --- |
| `queries.ts` | aircraft question-bank reads and answer-key lookup |
| `class-queries.ts` | class rating equivalents of aircraft reads |
| `flying-knowledge-queries.ts` | ATPL/flying knowledge equivalents |
| `attempts.ts` | answer persistence, test result recording, session resume lookup |
| `reports.ts` | learner progress summaries, topic performance, retry queues |
| `flags.ts` | flagged-question toggling and retrieval |
| `notes.ts` | question note save/load |
| `subscriptions.ts` | subscription lookup, free-tier accounting, Stripe sync storage |
| `gift-codes.ts` | gift code creation, disable, redemption, listing |
| `users.ts` | user creation and password hash update |
| `password-reset.ts` | reset-token issue/find/consume/sweep |
| `email-verification.ts` | verification-token issue/find/consume/sweep |
| `login-attempts.ts` | anti-abuse limits for login, preview, redeem, verify, and logbook upload |
| `owner.ts` | owner dashboard, account management, access grants, interest and subscriber views |
| `insights.ts` | signup funnel, access summary, question-quality signals |
| `question-reports.ts` | learner issue reports and owner review workflow |
| `broadcasts.ts` | broadcast queue creation, delivery claiming, status updates |
| `settings.ts` | site setting read/write with typed parsing |
| `logbooks.ts` | saved logbook lifecycle, extraction reservation, unlocks, credits |
| `logbook-owner.ts` | owner-side logbook usage reporting |
| `audit-log.ts` | operational audit trail |

### Important Schema Pattern

One notable design decision is that downstream study-state tables are intentionally not tightly foreign-keyed to mutable question content in every place. This allows historical attempts, flags, notes, and reports to survive content reseeding and content evolution without breaking runtime history.

## 9. Content Pipeline: `src/content` and `content/`

The repository-authored question banks live under `content/`.

### Content Trees

| Tree | Purpose |
| --- | --- |
| `content/<aircraft>` | aircraft type-rating banks |
| `content/classes/<code>` | class rating banks |
| `content/flying-knowledge/<code>` | ATPL/flying knowledge banks |

Each content unit includes:

- a manifest file such as `aircraft.json`, `class.json`, or `subject.json`
- a `questions/` directory containing JSON arrays of questions

### Loaders

| Module | Responsibility |
| --- | --- |
| `src/content/schema.ts` | canonical Zod schema for aircraft question files |
| `src/content/class-schema.ts` | class-rating schema |
| `src/content/flying-knowledge-schema.ts` | flying-knowledge schema |
| `src/content/load.ts` | loads and validates aircraft content |
| `src/content/load-classes.ts` | loads and validates class content |
| `src/content/load-flying-knowledge.ts` | loads and validates flying knowledge content |

### Content Behavior

- validation happens before seeding
- invalid content is collected into a list of issues instead of failing fast on the first error
- duplicate question IDs and mismatched folder/code relationships are explicitly checked
- content files are never read on user requests; they are synced into the database first

## 10. Operational Scripts: `scripts/`

| Script | Responsibility |
| --- | --- |
| `scripts/migrate.ts` | applies pending Drizzle migrations |
| `scripts/seed.ts` | syncs validated content into the DB and removes deleted records |
| `scripts/validate-content.ts` | validates all content trees without writing to the DB |
| `scripts/generate-gift-codes.ts` | CLI gift code generation |
| `scripts/generate-icons.tsx` | generates favicon and app icon assets |

### Most Important Script

`scripts/seed.ts` is a central maintenance entry point:

- loads all three content trees
- refuses to touch the DB if content validation fails
- upserts manifests and question rows
- removes rows that no longer exist in repository content
- keeps content publishing idempotent

## 11. Testing Strategy: `tests/`

The test suite uses Vitest and focuses heavily on business logic and persistence behavior instead of UI snapshots.

### Coverage Areas

- content validation and content-loading behavior
- grading, settings, and test-option logic
- password, reset, and verification logic
- DB query/mutation modules such as subscriptions, gift codes, reports, and logbooks
- Stripe and webhook-related logic
- logbook extraction normalization and exports

### Test Characteristics

- tests emphasize pure logic and module boundaries
- many files mirror `src/lib` and `src/db` responsibilities
- `tests/setup.ts` provides shared setup behavior
- fixtures and stubs support DB-independent and integration-style checks

## 12. Key Symbols Worth Knowing

This project has many exported functions. The list below highlights the ones that explain the architecture best.

| Symbol | Location | Why It Matters |
| --- | --- | --- |
| `RootLayout` | `src/app/layout.tsx` | global shell for every page |
| `TestBuilder` | `src/components/practice-test/test-builder.tsx` | pre-test configuration UX |
| `TestRunner` | `src/components/practice-test/runner.tsx` | core question-answer workflow |
| `getCurrentUser` | `src/lib/auth/session.ts` | request-scoped auth lookup |
| `createSession` | `src/lib/auth/session.ts` | secure session issuance |
| `parseSettings` | `src/lib/settings.ts` | typed configuration boundary |
| `buildTestHrefFor` | `src/lib/test-options.ts` | canonical test URL builder |
| `gradeTest` | `src/lib/grading.ts` | result computation |
| `canAnswerQuestion` | `src/lib/billing/access-policy.ts` | entitlement gate for practice |
| `createCheckoutSession` | `src/lib/billing/stripe.ts` | paid checkout entry point |
| `verifyStripeSignature` | `src/lib/billing/stripe-webhook.ts` | Stripe trust boundary |
| `sendEmail` | `src/lib/email/send.ts` | email transport seam |
| `extractLogbookPage` | `src/lib/logbook/claude.ts` | AI extraction entry point |
| `validateLogbook` | `src/lib/logbook/validate.ts` | logbook consistency engine |
| `getDb` | `src/db/index.ts` | typed DB access root |
| `listTopics` | `src/db/queries.ts` | test builder topic source |
| `pickTestQuestions` | `src/db/queries.ts` | randomized test composition |
| `saveAnswer` | `src/db/attempts.ts` | answer persistence |
| `recordTestResult` | `src/db/attempts.ts` | final result persistence |
| `getSummary` | `src/db/reports.ts` | progress dashboard input |
| `upsertSubscription` | `src/db/subscriptions.ts` | Stripe state sync target |
| `loadContent` | `src/content/load.ts` | content validation and collection |

## 13. Dependency Relationships

### Layered Dependency Model

```text
src/app
  depends on -> src/components, src/lib, src/db

src/components
  depends on -> src/lib

src/lib
  depends on -> src/db, small utility modules, external services

src/db
  depends on -> drizzle-orm, pg, selected shared types from src/content

src/content
  depends on -> zod, node fs/path

scripts
  depends on -> src/content, src/db, dotenv
```

### Practical Examples

- test pages depend on `src/db/*-queries.ts` to load topics and question sets
- `TestRunner` depends on action handlers supplied by route-level `actions.ts`
- auth actions depend on `src/lib/auth/*`, `src/db/users.ts`, and token modules
- Stripe webhook handling depends on `src/lib/billing/stripe-webhook.ts` plus `src/db/subscriptions.ts`
- logbook extraction depends on `src/app/api/logbook/extract/route.ts`, `src/lib/logbook/*`, `src/db/logbooks.ts`, and rate-limit modules
- seeding depends on `src/content/*` loaders and `src/db/schema.ts`

### Important Coupling Choices

- content and runtime state are deliberately separated
- the three study trees share downstream patterns but keep separate content tables
- most external-service code is isolated in `src/lib`, keeping `src/app` thinner
- UI components do not directly own persistence; they operate through server actions or server-rendered props

## 14. How to Run the Project

### Prerequisites

- Node.js 20 or newer
- a Postgres database, local or hosted

### Local Setup

```bash
npm install
cp .env.example .env.local
# edit .env.local and set DATABASE_URL
npm run setup
npm run dev
```

Development server:

- `http://localhost:3000`

### Core Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run test
npm run check
npm run validate:content
npm run db:migrate
npm run db:seed
npm run db:studio
```

### Deployment Notes

- the repository is designed for Vercel-style deployment
- `npm run vercel-build` runs migrations, seeds content, then builds the app
- `DATABASE_URL` is required for both local and deployed environments
- password reset email delivery requires email provider configuration
- Stripe billing requires the relevant Stripe keys and webhook secret
- Logbook Scanner requires `ANTHROPIC_API_KEY`

### Common Runtime Configuration

Based on code usage and the README, notable environment variables include:

- `DATABASE_URL`
- `DATABASE_POOL_MAX`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `APP_URL`
- `STRIPE_WEBHOOK_SECRET`
- Stripe secret key and price IDs used by billing code
- `ANTHROPIC_API_KEY`
- `LOGBOOK_MODEL`
- `LOGBOOK_EFFORT`

## 15. Suggested Reading Order

For a new contributor, this order gives the fastest understanding:

1. `README.md`
2. `src/app/layout.tsx`
3. `src/app/page.tsx`
4. `src/components/practice-test/test-builder.tsx`
5. `src/components/practice-test/runner.tsx`
6. `src/app/type-rating/[code]/test/actions.ts`
7. `src/lib/test-options.ts`
8. `src/lib/grading.ts`
9. `src/lib/auth/session.ts`
10. `src/db/schema.ts`
11. `src/db/queries.ts`
12. `src/db/attempts.ts`
13. `src/db/reports.ts`
14. `src/content/load.ts`
15. `scripts/seed.ts`

## 16. Key Takeaways

- The project is a multi-product aviation study platform, not just a simple quiz app.
- Content authoring is repository-driven, while runtime behavior is DB-backed.
- The most important runtime systems are study delivery, resumable sessions, progress reporting, paid access, owner operations, and the AI logbook scanner.
- The architecture is cleanly layered and mostly functional, which makes the codebase easier to test and extend.
- Adding new question-bank material is primarily a content and seeding operation rather than a core application rewrite.
