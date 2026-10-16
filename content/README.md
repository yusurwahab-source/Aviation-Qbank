# Question content

Questions live here as JSON files, not in the database. The database is filled
from these files by `npm run db:seed`, so **these files are the source of
truth**. Edit a file, re-run the seed, and the website updates.

## Folder layout

```
content/
  b737/                     <- type ratings: one folder per aircraft, lowercase code
    aircraft.json           <- the aircraft's details
    questions/
      airplane-general.json  <- one file per FCOM chapter
      air-systems.json
      anti-ice-and-rain.json
      automatic-flight.json
  classes/                  <- class ratings, a separate content tree
    da40/                   <- one folder per class, lowercase code
      class.json            <- the class's details
      questions/
        airframe.json       <- one file per topic, each holding a JSON array
        electrical.json
        ...
  flying-knowledge/         <- Flying Knowledge, a third content tree
    ifr/                    <- one folder per subject, lowercase code
      subject.json          <- the subject's details
      questions/
        ifr-fundamentals.json  <- one file per topic, each holding a JSON array
        holding-procedures.json
        ...
```

`content/` holds **Type Rating Systems Knowledge** — large aircraft, each
its own folder directly under `content/`. `content/classes/` holds **Class
Rating Systems Knowledge** — light aircraft, each its own folder one level
down. A light aircraft sits directly here with no sub-category between it
and the section: there is no "single engine" or "multi engine" split, only
the aircraft. `content/flying-knowledge/` holds **Flying Knowledge** —
general theory not tied to any aircraft, each subject (Principles of Flight, Human Performance & Limitations and
Meteorology today, and whatever follows them) its own folder one level down, free in full by decision — see
the note on the three sections in `CLAUDE.md`.

Adding a second type rating, a second class rating, or a second Flying
Knowledge subject is a content job only. Nothing in the application code
needs to change — dropping a new folder under `content/`, `content/classes/`
or `content/flying-knowledge/` and running `npm run db:seed` is the whole
job.

A class rating (`content/classes/<code>/class.json` + `questions/`) is a
genuinely separate bank from a type rating's, validated by its own schema in
`src/content/class-schema.ts` and seeded into its own tables
(`class_ratings`, `class_questions`) — see the note on `classRatings` in
`src/db/schema.ts`. Question ids there look like `DA40-AIRF-0001` (class
code, topic code, four digits) — the same shape a type rating's question id
takes — and the `classCode` field takes the place of `aircraft`, but every
other rule below holds identically.

A Flying Knowledge subject (`content/flying-knowledge/<code>/subject.json` +
`questions/`) is a third, equally separate bank, validated by
`src/content/flying-knowledge-schema.ts` and seeded into
`flying_knowledge_subjects`/`flying_knowledge_questions` — see the note on
`flyingKnowledgeSubjects` in `src/db/schema.ts`. Question ids there look
like `POF-AERO-0001`, and `subjectCode` takes the place of `aircraft`/
`classCode`. One rule does not carry over: this section is free in full, so
none of its questions are ever counted against `FREE_QUESTIONS_PER_AIRCRAFT`
or gated by a subscription.

## Rules that are checked automatically

`npm run validate:content` runs before every build and before every seed. It
fails loudly — with the file name and the exact problem — if any of these are
broken:

- Every field matches the schema in `src/content/schema.ts`.
- Question ids are unique across the whole repository.
- A question id looks like `DA40-ELEC-0042`: aircraft code, topic code, four digits.
- The aircraft code in the id and in the `aircraft` field match the folder.
- A question has between 2 and 5 options, and each option id is unique.
- `correct` names an option that actually exists.
- No unexpected fields (a typo like `explaination` is an error, not a silent loss).

## Draft vs published

Only questions with `"status": "published"` are shown to users. `draft`
questions are still loaded into the database, so they can be reviewed later,
but they never appear in a test.

`DA40-PWRP-0003` is deliberately left as a draft. It is the working proof that
the filter does what it says: the DA40 folder holds 11 questions and a test can
only ever draw on the 10 published ones.

## The DA40 bank

The aircraft is the **Diamond DA 40 D TDI** — the diesel variant with the
TAE 125 engine, running on Jet A-1.

The code stays `DA40`, unchanged since the aircraft's own display name was
last changed. The code is the URL segment, the prefix of every question id,
and the value stored on every past attempt, so changing it would break links
and orphan history for no gain — the reasoning that held when this bank
still lived directly under `content/da40/` holds just as well now that it
lives under `content/classes/da40/`: the move to the class rating tree
(`CLAUDE.md`, "many aircraft" → "three sections") changed where the folder
sits and how the questions declare their parent (`classCode` in place of
`aircraft`), but never the code, and never a question id.

### The whole bank is sourced from the DA 40 D AFM

Every question in every topic file below was written directly from the
Diamond DA 40 D Airplane Flight Manual (Doc. # 6.01.05-E, Revision 6/7,
31-Jul-2013 / 27-Sep-2013 — the TAE 125 diesel engine variant, not the
Lycoming/AVGAS DA40 that the bank briefly, wrongly, described earlier). Every
question carries a `reference` naming the AFM chapter and section it came
from (`AFM 2.4`, `AFM 7.9.5`, and so on), and every option was checked
against the manual's own wording rather than invented — including where the
manual gives two different limits for the two engine designations it covers,
TAE 125-01 and TAE 125-02-99 (MÄM 40-256 carried out), which several
questions test directly (RPM limits, restart altitude, coolant type, fuel
temperature limits, the RPM instrument marking that has no yellow caution
arc on the -02-99 at all).

One figure was deliberately left alone rather than guessed: AFM 2.10's
maneuvering load factor table prints its values without decimal points in
the source PDF — and rendering the actual page as an image (not just the
text extraction) confirms this is how the document itself is typeset, not
an extraction artifact. Rather than assume where the decimal point belongs,
no numeric question was built on that table; the approved-maneuvers bank
angles (2.9, whole numbers, unambiguous) are used instead for that section.

| File | Topic | Questions |
|---|---|---|
| `limitations.json` | Limitations | 55 |
| `emergency-procedures.json` | Emergency Procedures | 34 |
| `normal-procedures.json` | Normal Procedures | 27 |
| `abnormal-procedures.json` | Abnormal Procedures | 19 |
| `powerplant.json` | Powerplant | 26 |
| `fuel.json` | Fuel System | 25 |
| `electrical.json` | Electrical | 26 |
| `propeller.json` | Propeller | 7 |
| `flight-controls.json` | Flight Controls | 18 |
| `airframe.json` | Airframe | 23 |

260 questions, all published. `Limitations` draws on AFM Chapter 2,
`Emergency Procedures` on Chapter 3, `Normal Procedures` and
`Abnormal Procedures` on Chapters 4A and 4B, and the remaining six topics on
Chapter 7 (Description of the Airplane and its Systems) — `Airframe` folding
in the landing gear, instrument panel, canopy/cabin, pitot-static and stall
warning sections (7.2, 7.4, 7.5, 7.6, 7.7, 7.8, 7.11, 7.12, 7.13) alongside
the fuselage/wing/empennage material, since none of those has enough AFM
content on its own to be a topic a report would usefully group by.

A self-contained study guide covering the same ten topics, with the same
AFM references, lives at `public/da40-study-guide.html`, in English —
not under `content/`, because nothing under `content/` is ever served to
a browser; see the note on `lib/study-guide.ts` in `CLAUDE.md`, including
why "does the file exist" turned out to be the wrong question to ask at
request time on Vercel. The DA40 overview page links to it because `DA40`
is in that file's small hand-kept set of codes. `public/da40-study-guide-ar.html`
is the original Arabic version, kept for a possible future translated
edition — it is a real file on disk, byte-for-byte reachable at its own
URL like any other file in `public/`, but nothing in the app links to it,
since `CLAUDE.md` states plainly that all user-facing content is English.

This replaced an earlier, much smaller (22-question) version of this bank in
full: the old `Airframe`, `Electrical` and `Flight Controls` questions were
written only to exercise the system and were never checked against the AFM;
the old `Powerplant` questions described a Lycoming IO-360 piston engine on
AVGAS — the wrong engine for this airframe entirely, and were kept as
`draft` for that reason; and only 16 of the old `Fuel System` questions came
from the owner's own source file, with no `reference` on any of them. None
of that content survives — every file was replaced outright rather than
merged with the new, sourced questions, so there is nothing left to flip
back to `published`.

The correct answer is spread as evenly as each file's own count allows: each
topic's questions were generated with the correct option cycling through
A, B, C and D in turn (distractors keeping their relative order around it,
the same technique the B737 bank's own conversion used — see below), so no
file leans on one letter the way the earliest B737 sections once did.

## The C152 bank

The aircraft is the **Cessna 152, 1978 Model** — a two-seat, high-wing,
single-engine trainer with a carbureted Lycoming O-235-L2C, fixed tricycle
gear and a fixed-pitch propeller. The second class rating, added the same
content-only way the DA40 already proved: `content/classes/c152/` alone, no
application code touched.

Every question was written directly from the **1978 Pilot's Operating
Handbook, Cessna Aircraft Company**, read section by section (General,
Limitations, Emergency Procedures, Normal Procedures, Performance, Weight &
Balance, and Airplane & Systems Descriptions). Every question carries a
`reference` naming the POH section and page it came from (`POH 2-3`,
`POH 7-17`, and so on, following this POH's own section-page numbering), and
every number was checked against the manual's own text rather than invented —
including the one deliberate omission: the Equipment List and the optional
avionics supplements in Section 9 (old Nav/Com, ADF, transponder and marker
beacon units no longer representative of how this aircraft is flown or
taught) carry no questions, the same reasoning the DA40 bank already applies
to a source table it chose not to build numeric questions on. The ELT
supplement, still genuinely relevant safety equipment, is the one exception,
folded into `emergency-procedures.json` under the "Emergency Procedures"
topic rather than given a topic of its own for eight questions.

| File | Topic | Questions |
|---|---|---|
| `limitations.json` | Limitations | 34 |
| `emergency-procedures.json` | Emergency Procedures | 35 |
| `normal-procedures.json` | Normal Procedures | 30 |
| `performance.json` | Performance | 21 |
| `weight-and-balance.json` | Weight & Balance | 12 |
| `powerplant.json` | Powerplant | 25 |
| `fuel.json` | Fuel System | 15 |
| `electrical.json` | Electrical System | 16 |
| `landing-gear-and-brakes.json` | Landing Gear & Brakes | 13 |
| `flight-controls.json` | Flight Controls | 14 |
| `flight-instruments.json` | Flight Instruments | 16 |
| `airframe.json` | Airframe | 12 |
| `propeller.json` | Propeller | 7 |

250 questions, all published. `Limitations` draws on POH Section 2,
`Emergency Procedures` on Section 3, `Normal Procedures` on Section 4,
`Performance` on Section 5, `Weight & Balance` on Sections 1 and 6, and the
remaining seven topics on Section 7 (Airplane & Systems Descriptions), split
by system rather than folded into one large "Systems" topic the way a
smaller bank might need to.

The correct answer is spread as evenly as each file's own count allows, using
the same cycling technique as the DA40 bank: correct options were generated
in a natural first position, then mechanically rotated through A, B, C and D
in order of appearance, keeping the distractors' relative order around
whichever position the correct answer landed on. Across the whole 250-question
bank this lands at roughly a quarter each, not exactly even but never leaning
on one letter the way an unrotated bank would.

A self-contained study guide covering the same thirteen topics, with the same
POH references, lives at `public/c152-study-guide.html`, in English — not
under `content/`, for the same "nothing under `content/` is ever served to a
browser" reason the DA40 guide's own note gives. The C152 overview page links
to it because `C152` is in `lib/study-guide.ts`'s small hand-kept set of
codes, alongside `DA40`.

## The DA42 bank

The aircraft is the **Diamond DA 42 NG** — a four-seat, twin-engine composite
trainer with two liquid-cooled Austro Engine E4-C diesels, retractable
tricycle gear and full dual-engine redundancy (independent alternators,
ECUs and fuel pumps per side). The third class rating, added the same
content-only way the C152 already proved: `content/classes/da42/` alone, no
application code touched. It is a light twin, not a large aircraft, so it
sits under Class Rating like the DA40 and C152 — the class/type split is
about aircraft size, not engine count; see the note on the three sections
in `CLAUDE.md`.

Every question was written directly from the **Diamond DA 42 NG Airplane
Flight Manual, Doc. # 7.01.16-E, Revision 4**, read chapter by chapter
(General, Operating Limitations, Emergency Procedures, Normal/Abnormal
Operating Procedures, Performance, Mass and Balance, and Description of the
Airplane and its Systems). Every question carries a `reference` naming the
AFM chapter/section it came from (`AFM 2.4`, `AFM 3.7.3`, and so on), and
every number was checked against the manual's own wording rather than
invented. Several limits in this AFM depend on which Mandatory or Optional
Design Change Advisory (MÄM/OÄM) is installed on a given airframe — maximum
take-off mass is 1900 kg by default but 1999 kg with MÄM 42-678 installed,
for instance. No question blends two configurations' numbers into one
answer: a conditional question either names the configuration explicitly
("without MÄM 42-678 installed…") or is built on the baseline figure alone,
with the explanation noting that a different value applies under the other
configuration.

Because this is a twin, one topic exists here that neither the DA40 nor the
C152 bank has: **One Engine Inoperative**, covering engine-failure
recognition, troubleshooting, securing/feathering, restart windows, and
landing or going around on one engine (AFM 3.6-3.9). `Avionics` and `Mass
and Balance` are also new relative to the DA40's own ten topics — the DA42's
AFM carries substantially more G1000/GFC 700-specific limitations than the
DA40's, and Chapter 5 (Performance) and Chapter 6 (Mass and Balance) both
have enough single-value, non-chart content (crosswind limits, fuel flow,
climb rates, moment arms) to support a topic of their own here, unlike the
DA40 bank which folded what little it had elsewhere.

| File | Topic | Questions |
|---|---|---|
| `limitations.json` | Limitations | 82 |
| `emergency-procedures.json` | Emergency Procedures | 32 |
| `one-engine-inoperative.json` | One Engine Inoperative | 35 |
| `normal-procedures.json` | Normal Procedures | 33 |
| `abnormal-procedures.json` | Abnormal Procedures | 26 |
| `powerplant.json` | Powerplant | 21 |
| `propeller.json` | Propeller | 9 |
| `fuel.json` | Fuel System | 18 |
| `electrical.json` | Electrical | 27 |
| `avionics.json` | Avionics | 20 |
| `flight-controls.json` | Flight Controls | 10 |
| `airframe.json` | Airframe | 17 |
| `mass-balance.json` | Mass and Balance | 9 |
| `performance.json` | Performance | 10 |

349 questions, all published. `Limitations` draws on AFM Chapter 2,
`Emergency Procedures` and `One Engine Inoperative` on Chapter 3,
`Normal Procedures` and `Abnormal Procedures` on Chapters 4A and 4B,
`Performance` on Chapter 5, `Mass and Balance` on Chapter 6, and the
remaining seven topics on Chapter 7 (Description of the Airplane and its
Systems).

The correct answer is spread as evenly as each file's own count allows,
using the same cycling technique as the DA40 and C152 banks: correct
options were generated in a natural first position, then mechanically
rotated through A, B, C and D in order of appearance, keeping the
distractors' relative order around whichever position the correct answer
landed on.

A self-contained study guide covering the same fourteen topics, with the
same AFM references, lives at `public/da42-study-guide.html`, in English —
not under `content/`, for the same "nothing under `content/` is ever served
to a browser" reason the DA40 guide's own note gives. It gives the
one-engine-inoperative material its own diagrams — a twin-engine systems
layout, an airspeed indicator marked with vMCA and vYSE, and a decision-flow
diagram for the engine-failure procedure — since that is the single most
safety-critical topic in a twin-engine AFM. The DA42 overview page links to
it because `DA42` is in `lib/study-guide.ts`'s small hand-kept set of codes,
alongside `DA40` and `C152`.

## The POF bank (Flying Knowledge)

The subject is **Principles of Flight**, the only subject in Flying
Knowledge, added the same content-only way any subject is. 569 questions across
fifteen topics, all published (1,000 until the pruning below).

### Rebuilt to 1,000, one section at a time

At the owner's request the bank and its guide were rewritten section by
section into an analytical, equation-led form, with compound, computational
questions that need more than one variable to be reasoned about rather than
a definition to be recalled. Each section shipped as its own pull request.

| # | Topic | File | Id range | Questions |
|---|---|---|---|---|
| 01 | Basic Aerodynamics | `basic-aerodynamics.json` | `POF-AERO-0036`–`0100` | 38 |
| 02 | Aerofoils and Lift Theory | `aerofoils-and-lift-theory.json` | `POF-AFOIL-0033`–`0097` | 6 |
| 03 | Lift and Drag | `lift-and-drag.json` | `POF-LIFT-0039`–`0113` | 28 |
| 04 | Boundary Layer | `boundary-layer.json` | `POF-BL-0029`–`0083` | 6 |
| 05 | Stalling | `stalling.json` | `POF-STALL-0043`–`0127` | 70 |
| 06 | High-Lift Devices | `high-lift-devices.json` | `POF-HLD-0031`–`0090` | 44 |
| 07 | Flight Controls: Primary | `flight-controls-primary.json` | `POF-CTRL-0039`–`0108` | 41 |
| 08 | Flight Controls: Secondary and Trim | `flight-controls-secondary.json` | `POF-TRIM-0025`–`0069` | 40 |
| 09 | Longitudinal Stability | `stability-longitudinal.json` | `POF-STABL-0035`–`0104` | 30 |
| 10 | Lateral and Directional Stability | `stability-lateral-directional.json` | `POF-STABLD-0035`–`0104` | 54 |
| 11 | High-Speed Flight: Compressibility | `high-speed-compressibility.json` | `POF-MACH-0035`–`0104` | 42 |
| 12 | High-Speed Flight: Shockwaves and Buffet | `high-speed-shockwaves.json` | `POF-SHOCK-0035`–`0099` | 24 |
| 13 | Propellers | `propellers.json` | `POF-PROP-0041`–`0120` | 54 |
| 14 | Aeroplane Loads and Limitations | `loads-and-limitations.json` | `POF-LOAD-0035`–`0104` | 42 |
| 15 | Windshear and Atmospheric Effects | `windshear-and-atmospheric-effects.json` | `POF-WSHR-0025`–`0079` | 50 |
| | | | | **569** |

### Pruned to 569, for pilots rather than engineers

At the owner's instruction 431 of the 1,000 were deleted: this site is for
student pilots, and questions on section theory, boundary-layer thickness,
shock-wave relations, supersonic lift slope, hinge-moment design, stability
derivatives, blade-element propeller theory and structural analysis are an
engineer's examination, not a pilot's. What stayed are the practical
calculations a pilot does (stall speed against weight and bank, load factor,
turn radius, density altitude, EAS/TAS/Mach, glide and climb gradients,
crosswind) and the operational and procedural questions. Aerofoils and Lift
Theory and Boundary Layer lost most of their questions (65 to 6 and 55 to 6).
The retired ids are never reused, so the id ranges in the table are where
the surviving questions were first numbered, not a count; the "Questions"
column is the current count. `attempts` keeps its history, as before.

`public/pof-study-guide.html` was rewritten at the same time to match: a
pilot's guide rather than an engineering reference, built around the
questions that remain, with diagrams, worked examples, three small
calculators (turn and stall speed, crosswind, density altitude) and a cheat
sheet. It names no book, school, regulator or syllabus.

Each rebuilt section **replaced** its file rather than adding to it, and its
questions took **new ids** continuing after the old ones. The retired ids
(the first-generation 501 questions) are never reused for a different
question: `attempts` keeps history by question id with no foreign key, so a
reused id would silently attach an old answer to a new question. `db:seed`
deleted the retired rows; the history survives. A future edit to a question
keeps its id and increments `version`; a replacement question takes the next
free number in its prefix.

The correct letter is spread by a deterministic shuffle, not by hand: keyed
on each question's id for sections 01–02, and from section 03 onward a
balanced assignment (each letter within one of a quarter of the file), with
the wrong options still shuffled per id.

### What the student sees never names a source

The guide and questions are phrased as plain aerodynamic statements: no
book, school, regulator, question bank or syllabus abbreviation appears
anywhere a student can read, at the owner's instruction. The guide's former
"About this guide" callout was removed for that reason.

That rule is about user-facing text only. The honest record stays here:
**every question was authored by the assistant — not transcribed from any
textbook, syllabus or question bank, including the Principles of Flight
book the owner pointed at, and not checked against one.** The figures are
standard aerodynamic relations and standard-atmosphere values, computed
rather than copied, and every numeric answer was recomputed when it was
written. Where a figure is a typical value rather than a law (limit load
factors, buffet margins, hazard thresholds), it is stated as typical. It
should still be reviewed by a qualified instructor before a student relies
on it for a real exam — the same caution given to the
DA40's unsourced topics above.

`public/pof-study-guide.html` is this bank's study guide (see
`lib/study-guide.ts`). It is arranged as **fifteen chapters in the order of
the Principles of Flight book the owner pointed at**, from the contents list
the owner supplied: 1 Overview and Definitions, 2 The Atmosphere, 3 Basic
Aerodynamic Theory, 4 Subsonic Airflow, 5 Lift, 6 Drag, 7 Stalling, 8 High
Lift Devices, 9 Airframe Contamination, 10 Stability and Control, 11
Controls, 12 Flight Mechanics, 13 High Speed Flight, 14 Limitations, 15
Propellers. Only the chapter titles are used, and the page never names the
book. The chapters are **not** the same fifteen groups as the question
topics above. The mapping is ours, because only the titles were supplied:
the question topics that feed each chapter are listed at the foot of the
chapter, and the unavoidable judgement calls are these — windshear, wake
turbulence and microbursts sit in Chapter 14 (Limitations), wind arithmetic,
asymmetric flight (Vmc), climb, glide, range and turns in Chapter 12,
spoilers and trim in Chapter 11, Mach trim in Chapter 13, and frost, ice and
rain in Chapter 9. If the book places any of these elsewhere, moving a block
is an edit to the guide only. The question topics, ids and stored attempts
are untouched.

The guide has a one-screen cheat sheet, three small calculators (turn and
stall speed, crosswind, density altitude), worked examples that open on
demand, and 24 inline SVG diagrams in both themes. The graphs are drawn from
the equations they illustrate (for example the drag curve, the lift curve and
the V–n diagram); the buffet band, the Mach regimes, the crossover altitude
and the microburst profile are labelled or drawn as schematics. It has been
checked at 375px for horizontal overflow and in the dark theme.

## The HPL bank (Flying Knowledge)

The subject is **Human Performance & Limitations** (code `HPL`), the
second subject in Flying Knowledge, added the same content-only way POF
was. 346 questions across sixteen topics, all published.

| # | Topic | File | Ids | Questions |
|---|---|---|---|---|
| 01 | Safety Culture and Error Models | `safety-culture-and-error-models.json` | `HPL-SAFE-0001`–`0022` | 22 |
| 02 | Cardiovascular System | `cardiovascular-system.json` | `HPL-CARD-0001`–`0022` | 22 |
| 03 | Oxygen and Respiration | `oxygen-and-respiration.json` | `HPL-OXY-0001`–`0024` | 24 |
| 04 | Hearing and Balance | `hearing-and-balance.json` | `HPL-EAR-0001`–`0020` | 20 |
| 05 | Vision | `vision.json` | `HPL-VIS-0001`–`0022` | 22 |
| 06 | Flying and Health | `flying-and-health.json` | `HPL-HLTH-0001`–`0024` | 24 |
| 07 | Stress | `stress.json` | `HPL-STRS-0001`–`0020` | 20 |
| 08 | Information Processing and Human Error | `information-processing-and-human-error.json` | `HPL-INFO-0001`–`0024` | 24 |
| 09 | Behaviour and Motivation | `behaviour-and-motivation.json` | `HPL-BEHV-0001`–`0020` | 20 |
| 10 | Visual Illusions and Spatial Disorientation | `visual-illusions-and-spatial-disorientation.json` | `HPL-ILLUS-0001`–`0022` | 22 |
| 11 | Sleep and Fatigue | `sleep-and-fatigue.json` | `HPL-SLEEP-0001`–`0024` | 24 |
| 12 | Individual Differences and Leadership | `individual-differences-and-leadership.json` | `HPL-INDIV-0001`–`0020` | 20 |
| 13 | Communication and Cooperation | `communication-and-cooperation.json` | `HPL-COMM-0001`–`0020` | 20 |
| 14 | Man and Machine | `man-and-machine.json` | `HPL-MACH-0001`–`0020` | 20 |
| 15 | Decision Making and Risk | `decision-making-and-risk.json` | `HPL-DEC-0001`–`0022` | 22 |
| 16 | CRM and Incident Reporting | `crm-and-incident-reporting.json` | `HPL-CRM-0001`–`0020` | 20 |
| | | | | **346** |

### Authored, not transcribed — and why that boundary matters here specifically

The owner pointed at a specific book for this subject: CAE Oxford Aviation
Academy's *Human Performance and Limitations*, Book 8 of its ATPL Ground
Training Series — a copyrighted, commercially sold ground-school text whose
own copyright notice reserves reproduction, copying and adaptation "in
whole or in part." That rules out transcribing from it, closely paraphrasing
its prose or worked examples, or reproducing anything from its own
"Specimen Questions" chapter. **Every question and the study guide here
were authored by the assistant from general knowledge of the subject, not
from the book's text — the same boundary POF already drew around the
Principles of Flight book the owner pointed at there, and not a new
decision made for this bank.**

The sixteen topics above follow the book's own chapter order (Basic
Concepts through Introduction to Crew Resource Management, renamed to
read as topics rather than chapter titles, and skipping only its Specimen
Questions, Glossary and Index). That is a safe thing to mirror and the F
AIR bank's own case already draws the same line this bank needs: a
syllabus's topic breakdown is not the same as the expression within it,
and this particular breakdown — hypoxia and respiration, the ear and
balance, stress, information processing and error, sleep and fatigue,
decision making, CRM — is the standard EASA ATPL 040 "Human Performance &
Limitations" syllabus taught in broadly the same shape by ground schools
generally, not an arrangement unique to this one textbook.

What is actually original, question by question: the stems, the four
options each, the explanations, and every worked figure or example. The
underlying facts drawn on — the stages of hypoxia, Time of Useful
Consciousness falling sharply with altitude, Reason's Swiss Cheese model,
the Skill-Rule-Knowledge model, the five hazardous attitudes, somatogyral
and somatogravic illusions, the circadian low in the early hours of the
morning — are standard physiology and human-factors concepts taught
consistently across ICAO- and EASA-aligned training generally, the same
category of "consistent across training worldwide" figure the POF bank's
own note already describes, not a fact unique to the one book the owner
named. Where this guide states a number, it is stated as a typical or
schematic figure rather than copied from any one table (the Time of Useful
Consciousness diagram in the study guide is explicitly labelled
schematic for exactly this reason), the same caution the POF bank's
figures take.

### What the student sees never names a source

Exactly the same rule POF already follows, at the same owner's
instruction: the guide and questions are phrased as plain statements about
human performance — no book, school, regulator, question bank or syllabus
abbreviation appears anywhere a student can read. The honest record stays
here and in `CLAUDE.md` only.

`public/hpl-study-guide.html` is this bank's study guide (see
`lib/study-guide.ts`): sixteen numbered sections matching the sixteen
topics, each with a key-idea callout, a table or card grid, and — for the
five sections where a picture genuinely helps (the Swiss Cheese model, the
Time of Useful Consciousness curve, the arousal–performance inverted-U,
the G-force progression to G-LOC, and the circadian alertness curve) — one
inline SVG diagram, explicitly captioned as schematic rather than
measured data. Two small calculators (BMI, and a rough jet-lag recovery
estimate) sit in the guide's own "quick tools" section, in the same spirit
as POF's three calculators, scaled to what this subject's content
actually supports. All diagrams use the page's own colour tokens, so they
work in both themes, and the page has been checked at 375px for
horizontal overflow.

This should be reviewed by a qualified instructor before a student relies
on it for a real exam — the same caution already given to the POF
bank and the DA40's unsourced topics above. None of it has been checked
against the CAE Oxford textbook, or against any other human-factors
syllabus, question by question.

## The MET bank (Flying Knowledge)

The subject is **Meteorology** (code `MET`), the third subject in Flying
Knowledge, added the same content-only way POF and HPL were. 1,400
questions across twenty-nine topics, all published.

| # | Topic | File | Ids | Questions |
|---|---|---|---|---|
| 01 | The Atmosphere | `the-atmosphere.json` | `MET-ATMO-0001`–`0061` | 61 |
| 02 | Pressure | `pressure.json` | `MET-PRES-0001`–`0044` | 44 |
| 03 | Density | `density.json` | `MET-DENS-0001`–`0030` | 30 |
| 04 | Pressure Systems | `pressure-systems.json` | `MET-PSYS-0001`–`0047` | 47 |
| 05 | Temperature | `temperature.json` | `MET-TEMP-0001`–`0050` | 50 |
| 06 | Humidity | `humidity.json` | `MET-HUM-0001`–`0043` | 43 |
| 07 | Adiabatics and Stability | `adiabatics-and-stability.json` | `MET-STAB-0001`–`0057` | 57 |
| 08 | Turbulence | `turbulence.json` | `MET-TURB-0001`–`0055` | 55 |
| 09 | Altimetry | `altimetry.json` | `MET-ALT-0001`–`0063` | 63 |
| 10 | Winds | `winds.json` | `MET-WIND-0001`–`0071` | 71 |
| 11 | Upper Winds | `upper-winds.json` | `MET-UPWND-0001`–`0053` | 53 |
| 12 | Clouds | `clouds.json` | `MET-CLOUD-0001`–`0051` | 51 |
| 13 | Cloud Formation and Precipitation | `cloud-formation-and-precipitation.json` | `MET-PRECIP-0001`–`0048` | 48 |
| 14 | Thunderstorms | `thunderstorms.json` | `MET-TSTM-0001`–`0059` | 59 |
| 15 | Visibility | `visibility.json` | `MET-VIS-0001`–`0055` | 55 |
| 16 | Icing | `icing.json` | `MET-ICE-0001`–`0056` | 56 |
| 17 | Air Masses and Fronts | `air-masses-and-fronts.json` | `MET-AIRM-0001`–`0057` | 57 |
| 18 | Occlusions | `occlusions.json` | `MET-OCCL-0001`–`0035` | 35 |
| 19 | Other Depressions | `other-depressions.json` | `MET-DEPR-0001`–`0048` | 48 |
| 20 | Global Climatology | `global-climatology.json` | `MET-GLOB-0001`–`0056` | 56 |
| 21 | Local Winds and Weather | `local-winds-and-weather.json` | `MET-LOCW-0001`–`0034` | 34 |
| 22 | Area Climatology | `area-climatology.json` | `MET-AREA-0001`–`0043` | 43 |
| 23 | Route Climatology | `route-climatology.json` | `MET-ROUTE-0001`–`0040` | 40 |
| 24 | Satellite Observations | `satellite-observations.json` | `MET-SAT-0001`–`0027` | 27 |
| 25 | METARs | `metars.json` | `MET-METAR-0001`–`0066` | 66 |
| 26 | TAFs | `tafs.json` | `MET-TAF-0001`–`0043` | 43 |
| 27 | World Area Forecast System | `world-area-forecast-system.json` | `MET-WAFS-0001`–`0040` | 40 |
| 28 | Warning Messages | `warning-messages.json` | `MET-WARN-0001`–`0038` | 38 |
| 29 | Met Information in Flight | `met-information-in-flight.json` | `MET-INFLT-0001`–`0030` | 30 |
| | | | | **1,400** |

### Authored, not transcribed

The owner supplied a copy of a book they had bought for this subject: CAE
Oxford Aviation Academy's *Meteorology*, Book 9 of its ATPL Ground Training
Series. It is a copyrighted, commercially sold ground-school text, and the
owner's own instruction matched the boundary POF and HPL already drew: use
it for the information only, not for its content or the way it is written.
**Every stem, option, explanation and worked figure here, and the whole
study guide, were written by the assistant.** None of it was transcribed or
closely paraphrased, the book's worked examples were not reused, and its
specimen-question chapters were not read for authoring at all.

What was taken from the book is what any meteorology syllabus is made of:
the topic order (twenty-nine chapters, renamed as topics and skipping its
revision questions, specimen papers, glossary and index), and the standard
facts and figures meteorology is taught with everywhere: the ISA values,
the adiabatic lapse rates, Buys Ballot's law, the 27 ft per hPa and
4 ft per °C per 1000 ft rules of thumb, the cloud and fog types, the jet
stream families, the named local winds, and the ICAO report and forecast
codes (METAR, TAF, SIGMET and SIGWX). Every METAR, TAF and SIGMET example
is invented, and every calculation was worked again independently rather
than copied, which caught and fixed a handful of arithmetic slips during
authoring (the Föhn and FL200 altimetry answers among them).

Because a bank this size is easy to answer by spotting the longest option,
the distractors were rewritten in three passes until the correct option is
the strictly longest in about a third of questions (chance with four
options is a quarter), down from about seventy per cent in the first
draft. Correct positions are balanced across a–d.

### What the student sees never names a source

The same rule as POF and HPL: the guide and the questions are plain
statements about the weather. No book, school, regulator, question bank or
syllabus is named anywhere a student can read. The honest record stays
here and in `CLAUDE.md` only.

`public/met-study-guide.html` is this bank's study guide (see
`lib/study-guide.ts`). It has twenty-nine sections matching the
twenty-nine topics, each with a key-idea callout and a table, card grid or
worked example, plus a cheat sheet of the figures worth knowing by heart
and four calculators: ISA and ISA deviation, pressure and density
altitude, cumulus base from the spread, and the cold-temperature altimeter
correction. Five inline SVG diagrams (the ISA profile, the Föhn effect, a
microburst on the approach, a frontal cross-section and a wind barb) use
the page's colour tokens, so they work in both themes. The page has been
checked at 375px for horizontal overflow.

This should be reviewed by a qualified instructor before a student relies
on it for a real exam, the same caution given to POF and HPL. It has not
been checked question by question against the book or any other
meteorology syllabus. The climatology chapters (global, area and route)
describe typical seasonal patterns and are the most simplified part of
the bank.

## The B737 bank

The aircraft is the **Boeing 737-800**, the stretched Next Generation variant
with CFM56-7B engines. The code is `B737`, which names the **type rating** —
the rating is for the 737 family, not for one variant of it. `B737-800`, the
name in the source files' `aircraft` column, cannot be the code: codes are the
URL segment and the id prefix, so the schema allows only letters and digits.

The bank shipped briefly as `B738` and was renamed at the owner's request while
it was one section old. Be aware, if a second 737 variant is ever added, that
`B738` is the ICAO type designator for the -800 and `B737` for the **-700** —
so a -700 bank cannot have the obvious code. See the note in `CLAUDE.md`; the
code is fixed now that questions are published against it.

Each section is one file, named for the FCOM chapter it covers, so a new
chapter is a new file and never a change to an existing one:

| File | Section | Questions |
|---|---|---|
| `airplane-general.json` | Airplane General | 52 |
| `air-systems.json` | Air Systems | 67 |
| `anti-ice-and-rain.json` | Anti-Ice and Rain | 40 |
| `automatic-flight.json` | Automatic Flight | 60 |
| `communications.json` | Communications | 33 |
| `electrical.json` | Electrical | 60 |
| `engines-and-apu.json` | Engines and APU | 74 |
| `fire-protection.json` | Fire Protection | 48 |
| `flight-controls.json` | Flight Controls | 68 |
| `flight-instruments-and-displays.json` | Flight Instruments and Displays | 45 |
| `flight-management-and-navigation.json` | Flight Management and Navigation | 58 |
| `fuel.json` | Fuel | 55 |
| `hydraulics.json` | Hydraulics | 45 |
| `landing-gear-and-brakes.json` | Landing Gear and Brakes | 55 |
| `warning-systems.json` | Warning Systems | 42 |

802 questions, all published.

### What changed on the way in from the source file

Each section arrives as a CSV, one row per question. Two things in them cannot
be carried across as they are, and both are handled the same way every time:

- **Question numbers are three digits** (`B738-GEN-001`); the schema requires
  four. They are padded (`B737-GEN-0001`), which keeps the source ordering
  exactly and leaves room for a section to grow past 999.
- **Some ids carry an `L` marker** (`B738-GEN-L005`). An id has no room for
  it — the last segment must be digits. The marker means one thing in every
  section so far: every marked question, and no unmarked one, is a figure
  that varies by operator or configuration and says so in its explanation
  ("Verify against your operator FCOM"). So it survives as a tag,
  **`verify-fcom`** — queryable, rather than buried in prose. 48 questions
  carry it: 7 in Airplane General, 6 in Air Systems, 3 in Anti-Ice and Rain,
  6 in Automatic Flight, 2 in Communications, 3 in Electrical, 9 in Engines
  and APU, 2 in Fire Protection, 2 in Flight Controls, 2 in Flight Instruments
  and Displays, 1 in Flight Management and Navigation, 3 in Fuel and 2 in
  Landing Gear and Brakes.

  Hydraulics and Warning Systems carry none at all — the first sections with
  no operator-specific figure in them. The check below holds for those two the
  same way it holds everywhere else, on two empty sets.

  The equivalence is checked on the way in rather than assumed: conversion
  fails if the set of marked ids and the set of explanations containing
  "Verify" ever stop being the same set. Fifteen sections in, they never
  have.

The source files also name the aircraft `B738`; that is rewritten to the bank's
code on the way in.

Nothing else was altered on the way in. Question text, option text, correct
answers and explanations are byte-for-byte what the source file
held; this was checked field by field after conversion, not assumed. The one
later change is the order options appear in within a question, which is its own
deliberate decision — see below.

### The correct answer is spread evenly across A-D

The first three source files each leaned hard on one letter and **never once
answered `D`**. A student who noticed could score well above their real
knowledge without knowing the aircraft. So the options are redistributed as
each section comes in:

| Section | As authored | As published |
|---|---|---|
| Airplane General | A 14 · B 32 · C 6 · D 0 | A 13 · B 13 · C 13 · D 13 |
| Air Systems | A 36 · B 30 · C 1 · D 0 | A 17 · B 16 · C 17 · D 17 |
| Anti-Ice and Rain | A 28 · B 10 · C 2 · D 0 | A 10 · B 10 · C 10 · D 10 |
| Automatic Flight | A 19 · B 9 · C 14 · D 18 | A 15 · B 15 · C 15 · D 15 |
| Communications | A 9 · B 5 · C 5 · D 14 | A 8 · B 8 · C 8 · D 9 |
| Electrical | A 15 · B 15 · C 15 · D 15 | A 15 · B 15 · C 15 · D 15 |
| Engines and APU | A 18 · B 18 · C 19 · D 19 | A 18 · B 18 · C 19 · D 19 |
| Fire Protection | A 12 · B 12 · C 12 · D 12 | A 12 · B 12 · C 12 · D 12 |
| Flight Controls | A 17 · B 17 · C 17 · D 17 | A 17 · B 17 · C 17 · D 17 |
| Flight Instruments and Displays | A 11 · B 11 · C 11 · D 12 | A 12 · B 11 · C 11 · D 11 |
| Flight Management and Navigation | A 14 · B 15 · C 14 · D 15 | A 15 · B 15 · C 14 · D 14 |
| Fuel | A 13 · B 14 · C 15 · D 13 | A 14 · B 14 · C 13 · D 14 |
| Hydraulics | A 11 · B 11 · C 11 · D 12 | A 11 · B 11 · C 12 · D 11 |
| Landing Gear and Brakes | A 13 · B 14 · C 15 · D 13 | A 14 · B 14 · C 14 · D 13 |
| Warning Systems | A 10 · B 10 · C 11 · D 11 | A 10 · B 11 · C 11 · D 10 |
| **Whole bank** | **A 240 · B 223 · C 168 · D 171** | **A 201 · B 200 · C 201 · D 200** |

**Automatic Flight arrived already spread**, using all four letters and
scrambling its own numeric option sets — the first section to do so.
Communications uses all four too, but leans the other way from the first
three: `D` is its commonest answer, at 14 of 33. Both were still levelled,
because the target is the bank's total rather than any one file's.

**The later sections arrive level, and the redistribution has become almost a
no-op.** Electrical was the first: 15 of each letter, needing no spreading at
all. Fire Protection did the same, at 12 of each. Engines and APU came within
one letter of it. Their rows are identical, or nearly so, on both sides of the
table.

That is not a coincidence worth glossing over. The bank was already level, so
a section's fair share *is* an even quarter of itself, and the author had
already done the work.

None of them passed through untouched, because the ascending sorts below move
their own answers and knock the section off level — Electrical to 14/16/16/14,
Fire Protection to 10/15/11/12, Engines and APU to 17/21/19/17. What follows
is only enough movement to put it back:

| Section | Sorted | Moved for the spread | Exactly as authored |
|---|---|---|---|
| Electrical | 4 | 2 | 54 of 60 |
| Engines and APU | 4 | 3 | 67 of 74 |
| Fire Protection | 4 | 3 | 41 of 48 |
| Flight Controls | 0 | 0 | **68 of 68** |
| Flight Instruments and Displays | 0 | 1 | 44 of 45 |
| Flight Management and Navigation | 2 | 3 | 53 of 58 |
| Fuel | 1 | 2 | 52 of 55 |
| Hydraulics | 3 | 2 | 41 of 45 |
| Landing Gear and Brakes | 0 | 1 | **54 of 55** |
| Warning Systems | 0 | 2 | 40 of 42 |

**Flight Controls is the end point of that trend: it passed through
completely untouched.** It arrived at 17 of each letter against a target of 17
of each, and it contains no quantity question for a sort to disturb, so not one
of its 68 questions has its options in a different order from the source. The
conversion moved its ids and its aircraft code and changed nothing else.

That is the rule working as intended rather than an exception to it: the
redistribution exists to remove a guessable bias, so where there is no bias it
should do almost nothing. A section that arrives level should leave level, and
the diff should show it.

**How the minimum is found**, since "move as few as possible" is not by itself
an instruction: every question starts on the letter its author gave it, the
sorted questions take whatever letter the sort hands them, and then questions
are moved one at a time from a letter that is over its target to one that is
under — choosing, each time, the candidate furthest from anything already
moved, so the changes are spread through the file instead of clustering at one
end. Questions in the two tables below are never chosen, because their order is
already decided on other grounds.

**The arithmetic is over the whole bank, not one file.** A section is balanced
against what the other sections already hold, so the total stays level as the
bank grows — which is what matters, since a test can draw from any combination
of sections. This is why no section's own row is a clean quarter of itself:
Air Systems is 17/17/17/16 and Communications 8/8/8/9 because that is what
brings the *bank* level. 802 does not divide by four, so two letters carry
one more than the other two; the sections that take the bank off a multiple of
four are the ones whose rows look lopsided.

At conversion time only the *order* of the options changed. Every question kept
the same four option texts and the same correct answer — the sentence that was
right in the source was still the one marked right, it had simply moved — and
the distractors kept their relative order, so each question read as its author
wrote it. That was asserted field by field against the source CSV, not assumed.

**The distractors have since been rewritten**, which is the one claim above that
no longer holds. See *The distractors were tightened afterwards* below. The
correct answers came through that pass untouched as well.

**Questions whose options carry their own order are left alone**, because
scrambling them would make them harder to read for nothing: ascending
magnitudes (counts, durations, altitudes, pressures, rates, dimensions), the
No. 1 / No. 2 / No. 3 window numbering in `GEN-0016`, and the compressor-stage
progression in `AIR-0002`. Eighteen questions when that was written; forty-two
now, because the distractor pass gave several more of them a complete set of
magnitudes. The even split is reached around them.

From Automatic Flight onwards the numeric options are ascending too, but they
did not arrive that way. Every section since has shipped its quantity questions
**scrambled**, unlike the three before it, and they are sorted ascending at the
owner's request so the bank reads the same way throughout:

| Section | Sorted | What they count |
|---|---|---|
| Automatic Flight | `AFS-0008`, `0012`, `0023`, `0030`, `0031`, `0042`, `0043`, `0049` | Altitudes, speeds, the bank angle range, the course selectors |
| Communications | `COM-0001`, `0008`, `0025`, `0032` | Audio panels, VHF transceivers, keyed transmitters, recorder durations |
| Electrical | `ELE-0002`, `0004`, `0027`, `0040` | Generators, transformer rectifiers, kVA rating, battery endurance |
| Engines and APU | `ENG-0010`, `0020`, `0023`, `0024` | The takeoff EGT time limit, igniters, two N2 percentages |
| Fire Protection | `FIR-0002`, `0013`, `0021`, `0022` | Detection loops and extinguisher bottles |
| Flight Controls | *none* | The section asks no quantity question |
| Flight Instruments and Displays | *none* | The section asks no quantity question |
| Flight Management and Navigation | `FMS-0004`, `0050` | Database cycle length, transponder count |
| Fuel | `FUE-0002` | Boost pumps per tank |
| Hydraulics | `HYD-0001`, `0002`, `0003` | Systems, operating pressure, pumps per system |
| Landing Gear and Brakes | *none* | The section asks no quantity question |
| Warning Systems | *none* | The section asks no quantity question |

Three conventions hold throughout. An option naming no quantity goes last
(`V1`, `Acceleration altitude`). Equal quantities keep their source order —
which is what puts `COM-0032`'s two "Two" options, and `FIR-0013`'s two "One"
and two "Two" options, in the order the source wrote them. And **`None` is a
quantity, so it sorts first, not last**: `FIR-0021` and `FIR-0022` both open
with a `None …` option ahead of `One`, because zero is where that option
belongs on the scale rather than an absence of one.

**A number in an option does not by itself make a scale.** The test is whether
the question asks for a quantity *and* the options are points on one axis.
Where neither holds, sorting by a leading figure would order nothing
meaningful, so the options are left exactly as authored:

| Left alone | Why |
|---|---|
| `GEN-0032`, `FCT-0039` | *Sets* of values — ELT frequencies ("121.5, 243.0 and 406 MHz"), flap positions ("1, 2, 5, 10, 15, 25, 30 and 40") |
| `FUE-0001`, `GER-0001` | An *arrangement* — where the tanks are, tandem against tricycle — not a count on one axis |
| `FUE-0048` | Fuel grade names (`Jet A-1`, `100LL`, `95 octane`), not magnitudes |
| `HYD-0017` | `engine 1` is a numbered engine, not a quantity |
| `FMS-0025`, `GER-0042` | "One … and the other …" — a pronoun, not a count |
| `ELE-0001` | Volts *and* Hz *and* phase together — three axes, not one |
| `ELE-0031` | A voltage *and* a battery chemistry; the chemistry is the answer |
| `ENG-0001` | Spool count *and* flow type *and* bypass ratio at once |
| `ELE-0036`, `ELE-0054`, `ENG-0021`, `ENG-0060`, `GER-0006`, `GER-0022` | Sets and combinations of switch positions and selections, not magnitudes |
| `ENG-0009` | Named EGT limits (start, takeoff, continuous) |
| `ENG-0053` | Lists of parameters to monitor |
| `ELE-0018` | The answer is `Yes`; there is no quantity to sort |
| `ENG-0031`, `ENG-0063`, `FIR-0012`, `FIR-0046`, `FCT-0006`, `FCT-0024`, `FCT-0036`, `FCT-0040`, `FCT-0050`, `FID-0006`, `FID-0014`, `FMS-0035`, `FUE-0055`, `GER-0014`, `GER-0021`, `GER-0025`, `WRN-0009`, `WRN-0021` | Only *one* option carries a figure; the set is causes, limits, conclusions or an order of events |

That last row is by far the commonest case and the easiest to get wrong — it is
now eighteen questions, more than every other row combined. A lone "`A maximum of
two attempts per flight`", "`Automatically five seconds after the switch is
pulled`" or "`It is available only below 1000 ft`" sits among options that name
no quantity at all, so there is no scale for it to be a point on — sorting would
just promote the one option that happens to contain a digit. `FID-0006` is the
variant worth naming separately: `V1, VR and V2` look like figures but are
*names* of speeds, with no magnitudes to put in order.

This is the same judgement `GEN-0032` got, and it is the reason the rule is
stated as "the question asks for a quantity" rather than "the options contain
digits". Worth knowing about `ELE-0018`: its distractors name transfer bus 2
before transfer bus 1, and they do so **in the source**. The distractor order
is the author's, so it stands.

This is the one place where a distractor's position was changed for a reason
other than the answer spread, so it is the one place the "distractors keep their
relative order" rule above does not hold. The correct answer is still the same
sentence, and each section still hits the count it was given — the sorted
questions were placed first and the rest balanced around them.

`COM-0029` is the near miss worth recording. Its options are `The HF radio`,
`The passenger address system`, `VHF 1` and `VHF 2` — not points on a scale, so
there is nothing to sort — but the numbered pair still has an order, and moving
the answer (`VHF 1`) to `d` would have printed `VHF 2` above `VHF 1`. It was
kept off `d` for that reason alone; it sits at `a`, and the sort rule does not
otherwise apply to it.

**Keep this property when adding a section.** An even spread is only worth
having if the next chapter does not undo it.

The questions have no `reference` yet. Adding the FCOM chapter and page to each
would make them markedly more useful, and none was invented during conversion.

### The source files carry a `difficulty` column. It is dropped on the way in.

Every section's CSV has a `difficulty` of 1, 2 or 3 per row, and none of it
reaches the repository. The feature was removed at the owner's request — there
is no `difficulty` field in the question schema, no column in the database and
nothing on the test screen — so the column is read past like any other thing the
schema does not model.

This is worth stating because the schema is strict: a question file that still
carries `difficulty` fails `validate:content` as an unknown field rather than
being quietly accepted, which is asserted in `tests/content.test.ts`. When
section eleven arrives, drop the column; do not carry it across.
### The distractors were tightened afterwards

Once all fifteen sections were in, the bank was read through again for a
different problem: **questions that could be answered without knowing the
aircraft.** A wrong option that is obviously wrong, or that is visibly longer
and more detailed than the other three, hands the answer to a student who has
never seen a 737. 642 of the 802 questions had their three wrong options
rewritten; the other 160 already held up.

Only the wrong options moved. **Question text, explanation text and the wording
of every correct answer are byte-for-byte what they were**, which is checked
against a snapshot of all fifteen source files after every rebuild rather than
being taken on trust. No question was reworded — not one — so the 5% allowance
for turning a question into a NOT form went entirely unused.

What a wrong option now has to be:

- **True somewhere else on the aircraft.** A different control on the same
  panel, the opposite hydraulic system, the other 737 variant. A student who
  knows the type rules it out for this question; one who does not, cannot.
- **A near miss**, changing a single element of the right answer rather than
  saying something unrelated.
- **Within a tight band when it is a number.** 2500/3000/3500/5000 asks a real
  question; 1500/2000/3000/5000 answers itself.
- **Indistinguishable by shape.** All four options are close in length and share
  a grammatical form, and *the correct answer is never the longest or the most
  detailed* — the single most reliable tell in a badly written bank. Because the
  correct answer's wording was frozen, this was reached by lengthening the wrong
  options up to meet it, never by trimming the right one.
- **The only true option for the question as asked.** "All of the above" and
  "None of the above" appear nowhere in the bank.

### Figures, and which of them are actually sourced

A distractor for a numeric question is only safe if the number it surrounds is
right, so the figures were treated separately and conservatively. Acceptable
sources were Boeing documentation, a type certificate data sheet, and regulator
publications. Question banks, flashcard sites, forums and wikis were not used
for anything, including corroboration.

**Four figures are confirmed by two independent sources** and their option bands
were tightened on that basis:

| Question | Figure | Sources |
|---|---|---|
| `GEN-0030` | Emergency lighting, at least 10 minutes | 14 CFR 25.812(i); CS-25.812(i), CS-25 Amdt 28 |
| `GEN-0036` | Protective breathing equipment, 15 minutes | 14 CFR 25.1439(b)(5) and 121.337(b)(7)(i); CS-25.1439(b)(5) |
| `AIR-0058` | Cabin altitude warning at 10,000 ft | 14 CFR 25.841(b)(6); CS-25.841(b)(6) |
| `GEN-0043` | Overall length 39.5 m (129 ft 6 in) | Boeing D6-58325-7 Rev C; EASA TCDS IM.A.120 Issue 29 |

**Twenty-six questions turn on a figure that could not be corroborated twice.**
Their options are exactly as the source file wrote them: no band was narrowed
and no near-value alternative was invented around a number nobody had confirmed.
They are the ones asking for the recirculation fan count, cabin differential and
rate of climb, the icing TAT, the autopilot and autoland heights, THR HLD speed,
the CVR duration, generator rating and battery endurance, the EGT time limit and
the two N2 start percentages, loop and bottle counts, flap detents, the database
cycle, boost pumps per tank, hydraulic pressure, and the seating capacity, span
and tail height.

Three deserve their own note, because the sources disagree with the bank rather
than merely failing to confirm it:

- **`GEN-0005`, 189 passengers.** The EASA TCDS gives 189 *"with JAA/737-700/SC/
  D-14 applicable — or otherwise: 180"*, against the `(I, III, III, I)` exit
  arrangement that is the -800's. So the figure is this variant's, but it is
  conditional, and it rests on one source. Boeing's own 184 is a different
  quantity — a typical all-economy layout, not the certificated exit limit.
- **`GEN-0045`, tail height.** The bank says 12.5 m (41 ft 2 in); the TCDS says
  12.57 m (41 ft 3 in).
- **`COM-0025`, two hours of cockpit voice recording.** Two hours is the legacy
  TSO-C123a figure. 14 CFR 121.359 now requires **25 hours** for a recorder
  manufactured on or after 16 May 2025 — which is already one of the options.

None of the three was altered. They need an owner's decision, not a quiet edit.

The FAA's Dynamic Regulatory System refuses programmatic access, so **TCDS
A16WE could not be read**. It is the natural second source for the span and the
seating capacity and would settle the tail height; anyone with access should
start there.

## The A320 bank

The aircraft is the **Airbus A320 family** (A319, A320, A321 — one type rating).
It is a type rating aircraft, so it lives in `content/a320/` beside `b737/`;
adding it touched no application code beyond the study guide's hand-kept set in
`src/lib/study-guide.ts`.

**Where it came from, honestly.** The owner first supplied a third-party
A319/A320/A321 *Air Cond – Press – Vent* training PDF (132 pages of scanned
images, copy protected, carrying a training website's branding and Airbus's
drawings) and asked for questions and its diagrams. That material is someone
else's copyright, so **nothing was transcribed from it and none of its drawings
were copied** — the same boundary POF and HPL drew. The owner then asked for a
bank built from **open online sources a reader can check**, one unique fact per
question, which the owner will review.

The bank was rebuilt on that basis from the **FlyByWire A32NX documentation**
(`docs.flybywiresim.com`, the public documentation of an open-source A320
simulation, which describes each cockpit panel, ECAM page and protection in
detail). Questions and explanations are written in this bank's own words; the
docs' panel-by-panel facts (thresholds, logic, colours) are what was taken.

**At the owner's instruction, nothing a student reads names that source.** Each
question first carried a link to its page; the owner (who is reviewing every
question as a pilot) then asked for the sources to be removed from the
questions and the study guide, and for every one of them to tell the student
to check the FCOM of their own operator instead. So every question's
`reference` is now the same notice — "Study use only. Verify against the FCOM
of your operator and aircraft before relying on it." — the study guide carries
a "For study only" box and footer saying the same, and the aircraft
description says it too. This note and `CLAUDE.md` are the only record of the
source, the same arrangement as POF and HPL.

Two cautions remain:

- **The source documents an A320neo simulation.** Where a fact is specific to
  the neo (LEAP engines, centre-tank jet pumps, the N1/N2 red lines), the
  question says so. Others can differ on a given airframe or operator.
- **Simulator-only details were left out** — anything the docs mark as an
  MSFS limitation, the flyPad, or sim-specific behaviour.

**One fact, one question.** The generator refuses two questions with the same
fact key, and a cross-check of identical correct answers was used to catch the
same fact asked twice in different chapters (three such pairs were found and
removed or re-aimed). Two places where the source contradicts itself were
avoided rather than guessed: the windshear window's start after lift-off (3 s on
one page, 5 s on another — the question asks only for the 1 300 ft upper
limit), and an ambiguous APU fuel valve colour row.

**Sections follow the FCOM.** Each topic is named after its FCOM (ATA)
chapter — `21 Air Conditioning` through `70 Power Plant` — because the app
lists topics alphabetically, and the leading number makes that the FCOM order.
Chapter 21 and 22 are split into two or three topics each to keep them a
practical size, and the autoland limits and rejected take-off material, which
belong to the procedures and limitations volumes rather than the systems
description, sit last as `Procedures - Autoland and Rejected Take-off`.

**Not every FCOM chapter is covered.** There is nothing yet for 20 (General:
dimensions, cockpit layout), 38 (Water and Waste), 45 (Onboard Maintenance)
or 46 (Information Systems / datalink), and 25 (Equipment, 2 questions), 35
(Oxygen, 5) and 52 (Doors, 5) are thin, because the open source has little on
them. The limitations, procedures and performance volumes are touched only by
the autoland and rejected take-off section.

751 questions, all published, in 23 sections (one file each):

| File | Section | Code | Questions |
|---|---|---|---|
| `21-air-conditioning.json` | 21 Air Conditioning | COND | 33 |
| `21-pressurization.json` | 21 Pressurization | PRESS | 31 |
| `21-ventilation.json` | 21 Ventilation | VENT | 16 |
| `22-auto-flight-fcu-fma.json` | 22 Auto Flight - FCU and FMA | AFS | 59 |
| `22-auto-flight-flight-management.json` | 22 Auto Flight - Flight Management | FMS | 32 |
| `23-communications.json` | 23 Communications | COM | 18 |
| `24-electrical.json` | 24 Electrical | ELEC | 52 |
| `25-equipment.json` | 25 Equipment | EQPT | 2 |
| `26-fire-protection.json` | 26 Fire Protection | FIRE | 22 |
| `27-flight-controls.json` | 27 Flight Controls | FCTL | 87 |
| `28-fuel.json` | 28 Fuel | FUEL | 27 |
| `29-hydraulic.json` | 29 Hydraulic | HYD | 28 |
| `30-ice-and-rain-protection.json` | 30 Ice and Rain Protection | ICE | 39 |
| `31-indicating-recording.json` | 31 Indicating and Recording | IND | 91 |
| `32-landing-gear.json` | 32 Landing Gear | GEAR | 37 |
| `33-lights.json` | 33 Lights | LT | 15 |
| `34-navigation.json` | 34 Navigation | NAV | 45 |
| `35-oxygen.json` | 35 Oxygen | OXY | 5 |
| `36-pneumatic.json` | 36 Pneumatic | PNEU | 19 |
| `49-apu.json` | 49 APU | APU | 20 |
| `52-doors.json` | 52 Doors | DOOR | 5 |
| `70-power-plant.json` | 70 Power Plant | ENG | 42 |
| `pro-autoland-and-rejected-take-off.json` | Procedures - Autoland and Rejected Take-off | PRO | 26 |

The correct answer is spread across A–D (186 / 191 / 187 / 187). The study guide is
`public/a320-study-guide.html`: the study-only notice, an introduction per FCOM
chapter, every fact grouped by subtopic, and two original, simplified
schematics (air conditioning and pressurization).
