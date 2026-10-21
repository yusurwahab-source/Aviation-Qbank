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

## The RNAV bank (Flying Knowledge)

The subject is **Radio Navigation** (code `RNAV`, ATPL 062), added the same
content-only way as POF, HPL and MET. 911 questions across eighteen
topics, all published.

### Rebuilt in October 2026

An earlier RNAV bank of 382 questions covered chapters 1–7 only. An audit
found that 287 of its explanations began "The text states…" (naming the
source to the student), 88 stems were lifted word for word from the book —
including its own end-of-chapter questions — 55 % of the answers were
option b (67/210/82/23), two options were "none/all of the above", and
the files were misnamed (`chapter-6-ADF.json` held VDF, `chapter-7-.json`
had no name). It was retired in full and rewritten with new ids (no old id
reused), and chapters 8–18 were written for the first time.

### Source, and what was not used

The owner bought and supplied CAE Oxford Aviation Academy's *Radio
Navigation*, Book 11 of its ATPL Ground Training Series, with the
instruction to learn from it and quote facts, but not to copy its text.
The eighteen topics follow its chapter order (the standard ATPL 062
syllabus). Every question, explanation, calculation and the study guide
were written by the assistant from the facts; the book's own questions and
revision chapter were not used. Where the book is dated or inconsistent
the bank follows current, standard values instead and avoids the point:
it does not state an SSR transponder delay, uses L1/L2 only for GPS
(no "L3"), does not repeat the book's 2-dot/5-dot HSI mix-up (a 2-dot VOR
scale is 5° per dot), treats Galileo and BeiDou as operating systems, and
does not claim that SBAS cannot support Category I-like minima.
Regulators are not named in student-facing text ("the international
standard", not "ICAO").

### Order and format

Topic names carry their chapter number (`01 Properties of Radio Waves` …
`18 Global Navigation Satellite Systems (GNSS)`), because the app lists
topics alphabetically; the number keeps them in the book's sequence.
Inside each file the questions run in chapter order, grouped by
`subtopic`. Explanations are two to four sentences: why the answer is
right, the extra detail behind it, and the usual mistake.

| # | Topic | File | Ids | Questions |
|---|---|---|---|---|
| 01 | Properties of Radio Waves | `01-properties-of-radio-waves.json` | `RNAV-PRW-0001`–`0062` | 62 |
| 02 | Radio Propagation Theory | `02-radio-propagation-theory.json` | `RNAV-PRG-0001`–`0079` | 79 |
| 03 | Modulation | `03-modulation.json` | `RNAV-MDN-0001`–`0031` | 31 |
| 04 | Antennae | `04-antennae.json` | `RNAV-ANTN-0001`–`0034` | 34 |
| 05 | Doppler Radar Systems | `05-doppler-radar-systems.json` | `RNAV-DOPP-0001`–`0025` | 25 |
| 06 | VHF Direction Finder (VDF) | `06-vhf-direction-finder-vdf.json` | `RNAV-VDFN-0001`–`0031` | 31 |
| 07 | Automatic Direction Finder (ADF) | `07-automatic-direction-finder-adf.json` | `RNAV-ADFN-0001`–`0072` | 72 |
| 08 | VHF Omni-directional Range (VOR) | `08-vhf-omni-directional-range-vor.json` | `RNAV-VOR-0001`–`0071` | 71 |
| 09 | Instrument Landing System (ILS) | `09-instrument-landing-system-ils.json` | `RNAV-ILS-0001`–`0081` | 81 |
| 10 | Microwave Landing System (MLS) | `10-microwave-landing-system-mls.json` | `RNAV-MLS-0001`–`0025` | 25 |
| 11 | Radar Principles | `11-radar-principles.json` | `RNAV-RDR-0001`–`0050` | 50 |
| 12 | Ground Radar | `12-ground-radar.json` | `RNAV-GRDR-0001`–`0020` | 20 |
| 13 | Airborne Weather Radar | `13-airborne-weather-radar.json` | `RNAV-AWR-0001`–`0059` | 59 |
| 14 | Secondary Surveillance Radar (SSR) | `14-secondary-surveillance-radar-ssr.json` | `RNAV-SSR-0001`–`0048` | 48 |
| 15 | Distance Measuring Equipment (DME) | `15-distance-measuring-equipment-dme.json` | `RNAV-DME-0001`–`0048` | 48 |
| 16 | Area Navigation Systems (RNAV) | `16-area-navigation-systems-rnav.json` | `RNAV-ARNV-0001`–`0055` | 55 |
| 17 | Electronic Flight Information System (EFIS) | `17-electronic-flight-information-system-efis.json` | `RNAV-EFIS-0001`–`0046` | 46 |
| 18 | Global Navigation Satellite Systems (GNSS) | `18-global-navigation-satellite-systems-gnss.json` | `RNAV-GNSS-0001`–`0074` | 74 |

### Answer-shape checks

Correct letters a/b/c/d are within 24–25 % each. The correct option is
the single longest in 24 % of questions and the single shortest in 9 %
(MET, the reference bank: 33 % and 4 %). No duplicate stems. Every worked
figure (line of sight, radar timing, PRF, DME delay, glide path height and
rate of descent, slant range, bearings) was computed, not recalled.

`public/rnav-study-guide.html` is the study guide: eighteen chapter
sections in the same order, each with a key-idea callout, tables, cards
and worked examples, seven inline SVG diagrams, a cheat sheet and six
calculators (frequency/wavelength and band, line-of-sight range, radar
timing, glide path height and ROD, DME slant range, RBI bearings). Checked
at 1280px and 375px with no horizontal overflow and no script errors.

It should be reviewed by a qualified instructor before a student relies on
it for a real exam, the same caution as the other subjects.

## The Air Law bank (Flying Knowledge)

The subject is **Air Law** (code `LAW`, ATPL 010), added the same
content-only way as POF, HPL, MET and RNAV, and listed in the ATPL Ground
School section. 1,740 questions across twenty-six topics, all published.

### Source, and what was not used

The owner bought and supplied CAE Oxford Aviation Academy's *Air Law*
book from its ATPL ground training series, with the instruction to use it
as the information source. The twenty-six topics follow its chapter order
(chapter 0 is its definitions chapter). Every chapter was first inventoried
fact by fact (1,680 facts), then every question, explanation and the study
guide were written by the assistant from those facts — one fact per
question, at least one question per fact. The book's own questions,
specimen material and wording were not used, and the reader's watermark on
the supplied copy appears nowhere. Student-facing text names no book,
school, regulator or syllabus ("the Organization", "European rules").

Where the book is dated or wrong, the bank uses current values or leaves
the point out:

- Council of 36 members (book: 33); 19 Annexes.
- Montreal 1999 liability limits given "as adopted"; they have since been
  raised.
- CAT II RVR not less than 300 m; CAT IIIA at least 175 m; CAT IIIB
  50–175 m.
- Unlawful interference without contact: offset by 500 ft or 1000 ft
  according to the vertical separation in use.
- Communication failure in IMC: 7 minutes in a radar area, 20 minutes
  without radar.
- Pre-flight altimeter tolerance ±60 ft (test range 0–30 000 ft) and
  ±80 ft (0–40 000 ft).
- SNOWTAM in the runway-condition (RWYCC 6–0) format, valid 8 hours.
- Aerodrome code letter by wing span only; pavement strength described as
  aircraft vs pavement classification (now ACR/PCR, formerly ACN/PCN).
- Age 60–64: commercial air transport only in multi-pilot operations.
- Superseded EU investigation directives are described as "European
  rules", not by number.
- Left out as UK-specific, superseded or doubtful: red L, St George's cross
  and QDM boards, windsock speed figures, UK AIC colours, a 50-second
  land-after rule, "disregard an RA if the traffic is visual", OIS
  dimensions, stop-bar RVR figures, pre-2018 width tables, "COP every
  60 NM", hourly reports outside controlled airspace, a 2-day transit
  rule, NAT track spacing and an old list of RNP values.

### Order and format

Topic names carry their chapter number, as in RNAV. Inside each file the
questions run in chapter order, grouped by `subtopic`. Explanations are
two to four sentences.

| # | Topic | File | Ids | Questions |
|---|---|---|---|---|
| 00 | 00 Definitions and Abbreviations | `00-definitions-and-abbreviations.json` | LAW-DEF-0001–0184 | 184 |
| 01 | 01 International Agreements and Organizations | `01-international-agreements-and-organizations.json` | LAW-ORG-0001–0138 | 138 |
| 02 | 02 Airworthiness of Aircraft | `02-airworthiness-of-aircraft.json` | LAW-AIRW-0001–0019 | 19 |
| 03 | 03 Aircraft Nationality and Registration Marks | `03-aircraft-nationality-and-registration-marks.json` | LAW-REG-0001–0024 | 24 |
| 04 | 04 Flight Crew Licensing and Medical Requirements | `04-flight-crew-licensing-and-medical-requirements.json` | LAW-FCL-0001–0129 | 129 |
| 05 | 05 Rules of the Air | `05-rules-of-the-air.json` | LAW-RULES-0001–0214 | 214 |
| 06 | 06 Instrument Procedures - Departures | `06-instrument-procedures-departures.json` | LAW-DEP-0001–0045 | 45 |
| 07 | 07 Approach Procedures | `07-approach-procedures.json` | LAW-APP-0001–0088 | 88 |
| 08 | 08 Circling Approach | `08-circling-approach.json` | LAW-CIRC-0001–0012 | 12 |
| 09 | 09 Holding Procedures | `09-holding-procedures.json` | LAW-HOLD-0001–0029 | 29 |
| 10 | 10 Altimeter Setting Procedure | `10-altimeter-setting-procedure.json` | LAW-ALT-0001–0033 | 33 |
| 11 | 11 Parallel or Near-parallel Runway Operations | `11-parallel-or-near-parallel-runway-operations.json` | LAW-PARA-0001–0028 | 28 |
| 12 | 12 SSR and ACAS | `12-ssr-and-acas.json` | LAW-SSR-0001–0029 | 29 |
| 13 | 13 Airspace | `13-airspace.json` | LAW-ASPC-0001–0050 | 50 |
| 14 | 14 Air Traffic Services | `14-air-traffic-services.json` | LAW-ATS-0001–0071 | 71 |
| 15 | 15 Separation | `15-separation.json` | LAW-SEP-0001–0103 | 103 |
| 16 | 16 Control of Aircraft | `16-control-of-aircraft.json` | LAW-CTL-0001–0082 | 82 |
| 17 | 17 Aeronautical Information Service | `17-aeronautical-information-service.json` | LAW-AIS-0001–0056 | 56 |
| 18 | 18 Aerodromes - Physical Characteristics | `18-aerodromes-physical-characteristics.json` | LAW-ADP-0001–0077 | 77 |
| 19 | 19 Aerodromes - Visual Aids, Markings and Signs | `19-aerodromes-visual-aids-markings-and-signs.json` | LAW-VIS-0001–0067 | 67 |
| 20 | 20 Aerodrome Lighting | `20-aerodrome-lighting.json` | LAW-LGT-0001–0053 | 53 |
| 21 | 21 Obstacle Marking and Aerodrome Services | `21-obstacle-marking-and-aerodrome-services.json` | LAW-OBS-0001–0050 | 50 |
| 22 | 22 Facilitation | `22-facilitation.json` | LAW-FAL-0001–0028 | 28 |
| 23 | 23 Search and Rescue | `23-search-and-rescue.json` | LAW-SAR-0001–0039 | 39 |
| 24 | 24 Security | `24-security.json` | LAW-SEC-0001–0048 | 48 |
| 25 | 25 Aircraft Accident and Incident Investigation | `25-aircraft-accident-and-incident-investigation.json` | LAW-AAI-0001–0044 | 44 |

### Answer-shape checks

Correct letters a/b/c/d are 25/25/24/25 %. The correct option is the
single longest in 13 % of questions and the single shortest in 8 %. No
duplicate stems; near-duplicate stems were reworded so that each tests a
different angle. Every fact in the inventory is covered by at least one
question.

`public/law-study-guide.html` is the study guide: twenty-six chapter
sections in the same order, each with a key-idea callout, chips, tables,
comparison cards and worked examples, a cheat sheet and four quick tools
(runway designator, aerodrome reference code, Mach number technique,
semicircular cruising levels). Checked at 1366px and 375px, light and dark,
with no horizontal overflow and no script errors.

Air law changes more often than any other subject. It should be reviewed by
a qualified instructor against the current regulations before a student
relies on it for a real exam — especially licensing (chapter 4), the
rules of the air (chapter 5) and the dated points above.

## The Electrics & Electronics bank (Flying Knowledge)

The subject is **Electrics & Electronics** (code `AGK`), the electrics part
of ATPL subject 021 (Airframe, Systems, Electrics, Powerplant & Emergency
Equipment), added the same content-only way as the other subjects and listed
against 021 on the ATPL Ground School page. 1,000 questions across sixteen
topics, all published. The code `AGK` was chosen for the whole of 021 so
that the airframe/systems and powerplant books can be added to the same
subject later; the subject's display name can then be widened (the code
cannot change once attempts exist).

### Source, and what was not used

The owner bought and supplied CAE Oxford Aviation Academy's *Electrics and
Electronics* (Aircraft General Knowledge 2, Book 3 of its ATPL ground training
series), with the instruction to build the subject the same way as Radio
Navigation. Its sixteen teaching chapters were used in order (DC chapters
1–9, AC chapters 11–17); chapter 10 (specimen questions), every end-of-chapter
question set and the index were not used. Every question, explanation, worked
figure and the study guide were written by the assistant from the book's
facts, with new numbers in every worked example. Student-facing text names no
book, school, regulator or syllabus.

Topics are numbered 01–16 in sequence, so the AC chapters are one lower than
in the book (book chapter 11 = topic 10, … book 17 = topic 16).

Where the book is wrong, muddled or dated, the bank leaves the point out or
states it correctly:

- RMS is not "the value at the 45° point" (the book's shortcut); the bank
  uses only RMS = 0.707 × peak and the heating definition.
- The hydrogen atom is not described as having a neutron, and conductors and
  insulators are not described by "electrovalent" and "covalent" bonds.
- A three-phase motor that loses a phase is said to keep running with a hum
  and fail to restart — not to run "at about half speed".
- The book's NAND relay-circuit description contradicts its truth table; only
  the truth table is used.
- "System frequency becomes that of the alternator with the highest load"
  and the VSCF aircraft-type examples are left out.
- Maintenance figures given by the book — capacity test at least 80 % (every
  3 months), spare fuses 10 % of each rating with a minimum of 3, essential
  loads for 30 minutes — are kept as stated and should be checked against
  the operator's and current rules by an instructor.

### Order and format

Inside each file the questions run in chapter order, grouped by `subtopic`.
Explanations are two to four sentences; numeric questions say which slip
gives which wrong option.

| # | Topic | File | Ids | Questions |
|---|---|---|---|---|
| 01 | Electrics 01 DC Basic Principles | `01-dc-basic-principles.json` | AGK-BAS-0001–0087 | 87 |
| 02 | Electrics 02 DC Switches | `02-dc-switches.json` | AGK-SWI-0001–0035 | 35 |
| 03 | Electrics 03 Circuit Protection and Capacitors | `03-circuit-protection-and-capacitors.json` | AGK-CPC-0001–0082 | 82 |
| 04 | Electrics 04 Batteries | `04-batteries.json` | AGK-BAT-0001–0083 | 83 |
| 05 | Electrics 05 Magnetism | `05-magnetism.json` | AGK-MAG-0001–0046 | 46 |
| 06 | Electrics 06 Generators and Alternators | `06-generators-and-alternators.json` | AGK-GEN-0001–0087 | 87 |
| 07 | Electrics 07 DC Motors and Actuators | `07-dc-motors-and-actuators.json` | AGK-MOT-0001–0077 | 77 |
| 08 | Electrics 08 Aircraft DC Power Systems | `08-aircraft-dc-power-systems.json` | AGK-DCS-0001–0084 | 84 |
| 09 | Electrics 09 Bonding and Screening | `09-bonding-and-screening.json` | AGK-BND-0001–0022 | 22 |
| 10 | Electrics 10 Introduction to AC | `10-introduction-to-ac.json` | AGK-ACI-0001–0098 | 98 |
| 11 | Electrics 11 AC Alternators | `11-ac-alternators.json` | AGK-ALT-0001–0114 | 114 |
| 12 | Electrics 12 AC Distribution Systems | `12-ac-distribution-systems.json` | AGK-DIS-0001–0030 | 30 |
| 13 | Electrics 13 Transformers and Rectifiers | `13-transformers-and-rectifiers.json` | AGK-TRF-0001–0044 | 44 |
| 14 | Electrics 14 AC Motors | `14-ac-motors.json` | AGK-ACM-0001–0039 | 39 |
| 15 | Electrics 15 Semiconductors | `15-semiconductors.json` | AGK-SEM-0001–0036 | 36 |
| 16 | Electrics 16 Logic Gates | `16-logic-gates.json` | AGK-LOG-0001–0036 | 36 |

### Answer-shape checks

Correct letters a/b/c/d are 250/250/253/247. The correct option is the
single longest in 17 % of questions and the single shortest in 19 %. No
duplicate stems, no "all/none of the above", no source names.

`public/agk-study-guide.html` is the study guide: sixteen chapter sections in
the same order, each with a key-idea callout, chips, tables, comparison cards,
worked examples and inline diagrams, a cheat sheet and six calculators (Ohm's
law and power; series and parallel; battery endurance and capacity test;
poles, RPM and frequency with slip; reactance, impedance and power factor;
transformer ratio with star line voltage and RMS peak). Checked at 1280px and
375px, light and dark, with no horizontal overflow and no script errors.

It has not been reviewed by a qualified instructor and should be before a
student relies on it for a real exam.

## The Operational Procedures bank (Flying Knowledge)

The subject is **Operational Procedures** (code `OPS`, ATPL 070), added the
same content-only way as the other subjects and listed against 070 on the
ATPL Ground School page. 986 questions across nineteen topics, all published.

### Source, and what was not used

The owner supplied CAE Oxford Aviation Academy's *Operational Procedures*
(ATPL ground training series, Book 12, EASA revised first edition) and asked
for it to be added to the ATPL Ground School. Its nineteen teaching chapters
were used in order, for their facts only. The book's end-of-chapter questions,
answers, revision and specimen material, and its wording, were not used.
Every question, explanation, worked figure and the study guide were written by
the assistant. Student-facing text names no book, school, regulator,
regulation or syllabus ("the international standard", "current rules").

Where the book is dated or wrong, the bank uses current values or leaves the
point out:

- North Atlantic: "MNPS airspace" is now the NAT high level airspace
  (FL285–FL420). Contingency: turn at least 30° and offset 5 NM, then a
  500 ft level change (book: 45° and 15 NM). Weather deviation: level change
  of 300 ft beyond 5 NM (book: 10 NM). The SSR 2000 rule, polar track details
  and the polar track structure (which no longer exists) were left out.
- CVR: 25 hours for aeroplanes over 27 000 kg first certificated on or after
  1 January 2021 added. ELT 406 MHz (the book prints "406 kHz").
- Taxi clearance beyond a runway now needs an explicit crossing or hold-short
  instruction (the book says crossing is implied).
- Category III definitions use the current international figures (IIIA RVR
  at least 175 m, IIIB 50 m to below 175 m); the book's operator-table values
  (200 m, down to 75 m) are asked as operator minima, as is the Air Law bank.
- SNOWTAM validity 8 hours in the current runway-condition format (book:
  24 hours); runway condition codes 6–0 added. The braking-action coefficient
  table is presented as the older table; the book's SNOWTAM item letters and
  examples were not used.
- A380 "super" wake category added; the book's "300 ft per second" vortex
  figure left out.
- The superseded European operating rules the book quotes are described as
  "current rules" without a number. Left out as superseded: the aerial-work
  six-person exemption, met-report exemptions, the 15-month flight time
  record retention. Flight and duty values kept where the current scheme is
  the same (190 h/28 days, 60 h/7 days, 100 h/28 days, 900 h/year, 13 h basic
  FDP and sector reductions, 12/10 h rest with 8 h sleep, 2 h discretion).
- Swell versus wind waves: the book calls swell tidal; the bank says swell
  comes from distant weather.
- Unlawful interference level offset asked only for the 1000 ft vertical
  separation case (500 ft).

**Instructor review needed:** the all-weather tables (low visibility take-off
below 400 m, take-off RVR by facilities, CAT II RVR by DH, circling minima)
follow the book. The 2022 revision of the all-weather rules changed some of
them; they should be checked against the current regulations.

### Order and format

Topic names carry their chapter number. Inside each file the questions run in
chapter order, grouped by `subtopic`. Explanations are two to four sentences.

| # | Topic | File | Ids | Questions |
|---|---|---|---|---|
| 01 | 01 International Operating Standards | `01-international-operating-standards.json` | OPS-INT-0001–0040 | 40 |
| 02 | 02 General Requirements | `02-general-requirements.json` | OPS-GEN-0001–0061 | 61 |
| 03 | 03 Operator Certification and Supervision | `03-operator-certification-and-supervision.json` | OPS-CRT-0001–0048 | 48 |
| 04 | 04 Operational Procedures | `04-operational-procedures.json` | OPS-PRC-0001–0116 | 116 |
| 05 | 05 All Weather Operations | `05-all-weather-operations.json` | OPS-AWO-0001–0102 | 102 |
| 06 | 06 Aeroplane Equipment and Instruments | `06-aeroplane-equipment-and-instruments.json` | OPS-EQP-0001–0111 | 111 |
| 07 | 07 Crew, Logs and Records | `07-crew-logs-and-records.json` | OPS-CRW-0001–0095 | 95 |
| 08 | 08 Long Range Flight and Polar Navigation | `08-long-range-flight-and-polar-navigation.json` | OPS-LRN-0001–0021 | 21 |
| 09 | 09 North Atlantic High Level Airspace | `09-north-atlantic-high-level-airspace.json` | OPS-NAT-0001–0097 | 97 |
| 10 | 10 Special Procedures and Hazards | `10-special-procedures-and-hazards.json` | OPS-SPH-0001–0063 | 63 |
| 11 | 11 Fire and Smoke | `11-fire-and-smoke.json` | OPS-FIR-0001–0040 | 40 |
| 12 | 12 Pressurisation Failure | `12-pressurisation-failure.json` | OPS-PRS-0001–0017 | 17 |
| 13 | 13 Windshear and Microburst | `13-windshear-and-microburst.json` | OPS-WSH-0001–0022 | 22 |
| 14 | 14 Wake Turbulence | `14-wake-turbulence.json` | OPS-WKT-0001–0022 | 22 |
| 15 | 15 Security | `15-security.json` | OPS-SEC-0001–0019 | 19 |
| 16 | 16 Emergency and Precautionary Landings | `16-emergency-and-precautionary-landings.json` | OPS-ELD-0001–0019 | 19 |
| 17 | 17 Fuel Jettison | `17-fuel-jettison.json` | OPS-FJT-0001–0013 | 13 |
| 18 | 18 Transport of Dangerous Goods by Air | `18-transport-of-dangerous-goods-by-air.json` | OPS-DGR-0001–0045 | 45 |
| 19 | 19 Contaminated Runways | `19-contaminated-runways.json` | OPS-RWY-0001–0035 | 35 |

### Answer-shape checks

Correct letters a/b/c/d are 247/244/249/246. The correct option is the single
longest in 17 % of questions and the single shortest in 8 %. No duplicate
stems, no "all/none of the above", no source names.

`public/ops-study-guide.html` is the study guide: nineteen chapter sections in
the same order, each with a key-idea callout, chips, tables, comparison cards
and worked examples, a cheat sheet and seven calculators (visibility to RVR;
distance from land; cabin crew and equipment by seats; day of the year for the
track message identifier; aquaplaning speed; approach category; minimum rest).
Checked at 1280px and 375px with no horizontal overflow and no script errors.

It has not been reviewed by a qualified instructor and should be before a
student relies on it for a real exam.

## The Communications bank (Flying Knowledge)

The subject is **Communications** (code `COM`, ATPL 090), added the same
content-only way and listed against 090 on the ATPL Ground School page (the
code was already reserved there). 634 questions across seven topics, all
published.

### Source, and what was not used

The owner supplied CAE Oxford Aviation Academy's *Communications* (ATPL
ground training series, Book 14), which covers VFR and IFR radiotelephony.
Its seven teaching chapters were used in order, for their facts only; the
book's questions, answers, revision material and wording were not used.
Every example exchange uses invented call signs and places (Kelby, Marston,
Skyway, Northwind). Student-facing text names no book, school, regulator or
syllabus.

Corrections and choices:

- All six digits of a VHF frequency are passed whatever the spacing, unless
  the last two are zero (current rule); 8.33 kHz described as extended below
  the upper airspace.
- Braking action coefficient table presented as the older table.
- A worked aerial-height example whose book answer did not follow from the
  formula was recalculated (about 980 ft).

### Order and format

| # | Topic | File | Ids | Questions |
|---|---|---|---|---|
| 01 | 01 Definitions | `01-definitions.json` | COM-DEF-0001–0159 | 159 |
| 02 | 02 General Operating Procedures | `02-general-operating-procedures.json` | COM-GOP-0001–0143 | 143 |
| 03 | 03 Phraseology | `03-phraseology.json` | COM-PHR-0001–0154 | 154 |
| 04 | 04 Weather Information | `04-weather-information.json` | COM-WXI-0001–0032 | 32 |
| 05 | 05 Failures and Emergencies | `05-failures-and-emergencies.json` | COM-EMG-0001–0045 | 45 |
| 06 | 06 IFR Communications | `06-ifr-communications.json` | COM-IFR-0001–0044 | 44 |
| 07 | 07 VHF Propagation | `07-vhf-propagation.json` | COM-VHF-0001–0057 | 57 |

### Answer-shape checks

Correct letters a/b/c/d are 158/158/158/160. The correct option is the single
longest in 16 % of questions and the single shortest in 12 %. No duplicate
stems, no "all/none of the above", no source names.

`public/com-study-guide.html` is the study guide: seven chapter sections, a
cheat sheet and five tools (VHF range; how a frequency is spoken; phonetic
spelling and abbreviation of a call sign; QDM and QDR; wavelength and band).
Checked at 1280px and 375px with no horizontal overflow and no script errors.

It has not been reviewed by a qualified instructor and should be before a
student relies on it for a real exam.

## The Mass & Balance bank (Flying Knowledge)

The subject is **Mass & Balance** (code `MB`, ATPL 031), added the same
content-only way as the other subjects and listed against 031 on the ATPL
Ground School page. 410 questions across ten topics, all published.

### Source, and what was not used

The owner supplied CAE Oxford Aviation Academy's *Mass & Balance and
Performance* (ATPL ground training series, Book 6) and asked for it to be
added like the earlier subjects. The book gives Mass & Balance only two
chapters (the rules, and one long chapter on everything else), so the second
chapter was split by its own sections, in book order, into topics 02–10. The
chapters were used for their facts only. The book's end-of-chapter questions,
answers, revision questions, specimen paper and its wording and worked
examples were not used. Every question, explanation, worked figure and the
study guide were written by the assistant. Student-facing text names no book,
school, regulator, regulation, syllabus or data sheet.

Choices and corrections:

- The book's loading-manual graphs and data sheets are not in the text, so
  calculations use the assistant's own numbers rather than chart readings.
- Reweighing: 4 years for individual masses, 9 years for fleet masses (the
  current rule) — the book gives only the 4-year transfer rule.
- One book example labels a US-gallon fuel mass in pounds when the figure is
  kilograms; the bank keeps the units consistent (US gallon of water about
  8.33 lb, imperial about 10 lb).
- The MEL is described generally; "master" minimum equipment lists are the
  manufacturer's, the MEL the operator's.

### Order and format

Topic names carry their chapter number. Inside each file the questions run in
book order, grouped by `subtopic`. Explanations are two to four sentences.

| # | Topic | File | Ids | Questions |
|---|---|---|---|---|
| 01 | 01 Mass and Balance Rules | `01-mass-and-balance-rules.json` | MB-REG-0001–0093 | 93 |
| 02 | 02 Limitations and Effects of Mass and CG | `02-limitations-and-effects-of-mass-and-cg.json` | MB-LIM-0001–0045 | 45 |
| 03 | 03 Mass Definitions and Traffic Load | `03-mass-definitions-and-traffic-load.json` | MB-DEF-0001–0048 | 48 |
| 04 | 04 Weighing and the Basic Empty Mass | `04-weighing-and-the-basic-empty-mass.json` | MB-WGH-0001–0036 | 36 |
| 05 | 05 Fuel Mass and Fuel Terms | `05-fuel-mass-and-fuel-terms.json` | MB-FUEL-0001–0037 | 37 |
| 06 | 06 Loaded Mass and CG for Light Aircraft | `06-loaded-mass-and-cg-for-light-aircraft.json` | MB-LOD-0001–0029 | 29 |
| 07 | 07 CG as a Percentage of MAC | `07-cg-as-a-percentage-of-mac.json` | MB-MAC-0001–0022 | 22 |
| 08 | 08 Repositioning the CG | `08-repositioning-the-cg.json` | MB-CGR-0001–0032 | 32 |
| 09 | 09 Cargo Handling and Floor Loading | `09-cargo-handling-and-floor-loading.json` | MB-CRG-0001–0028 | 28 |
| 10 | 10 Large Aircraft Loading and Load Sheets | `10-large-aircraft-loading-and-load-sheets.json` | MB-LTS-0001–0040 | 40 |

### Answer-shape checks

Correct letters a/b/c/d are 101/103/105/101. The correct option is the single
longest in 10 % of questions and the single shortest in 10 %. No duplicate
stems, no "all/none of the above", no source names. Every calculation was
re-worked by script.

`public/mb-study-guide.html` is the study guide: ten chapter sections in the
same order, each with a key-idea callout, chips, tables, comparison cards,
diagrams and worked examples, a cheat sheet and eight calculators (loaded mass
and CG; CG and % MAC; moving mass; adding or removing mass; fuel volume to
mass; traffic load and underload; floor loading; standard passenger masses).
Checked at 1280px and 375px with no horizontal overflow and no script errors.

It has not been reviewed by a qualified instructor and should be before a
student relies on it for a real exam.

## The Performance bank (Flying Knowledge)

The subject is **Performance** (code `PERF`, ATPL 032), added the same
content-only way and listed against 032 on the ATPL Ground School page.
772 questions across eighteen topics, all published.

### Source, and what was not used

Same book as Mass & Balance (Book 6, which covers both subjects). Its eighteen
Performance teaching chapters were used in order, for their facts only. Its
revision chapters, end-of-chapter questions, answers, specimen paper, wording
and graph-reading exercises were not used. The flight manual data sheets the
book refers to (single-engine piston, multi-engine piston and a medium-range
jet) are not in the text, so graph questions are about how the charts work,
and calculations use the assistant's own numbers. Student-facing text names
no book, school, regulator, regulation, syllabus, aircraft type or data sheet
("the large aeroplane code", "the small aeroplane code", "current rules").

Choices and corrections:

- Contaminated runway uses the classic definition the book gives (more than
  25 % of the area, more than 3 mm of water or equivalent); the newer runway
  condition format is in the Operational Procedures bank.
- Pavement strength is asked as ACN/PCN with a note that the newer system uses
  ACR/PCR the same way; the book's 50 % overload figure was left out.
- Extended diversion operations: the 60-minute rule and the 120-minute example
  are kept; the book's dated figures and the 90-minute rule for aeroplanes
  with three or more engines were left out.
- The book's "L/D max at about 4°" figure was left out.

### Order and format

Topic names carry their chapter number. Inside each file the questions run in
book order, grouped by `subtopic`. Explanations are two to four sentences.
The Class A en route code is `CRE` (not `CAE`, which would read as a school
name).

| # | Topic | File | Ids | Questions |
|---|---|---|---|---|
| 01 | 01 Performance Introduction | `01-performance-introduction.json` | PERF-INT-0001–0090 | 90 |
| 02 | 02 General Principles of Take-off | `02-general-principles-of-take-off.json` | PERF-GTO-0001–0050 | 50 |
| 03 | 03 General Principles of Climb | `03-general-principles-of-climb.json` | PERF-GCL-0001–0080 | 80 |
| 04 | 04 General Principles of Descent | `04-general-principles-of-descent.json` | PERF-GDS-0001–0032 | 32 |
| 05 | 05 General Principles of Cruise | `05-general-principles-of-cruise.json` | PERF-GCR-0001–0069 | 69 |
| 06 | 06 General Principles of Landing | `06-general-principles-of-landing.json` | PERF-GLD-0001–0058 | 58 |
| 07 | 07 Single-engine Class B Take-off | `07-single-engine-class-b-take-off.json` | PERF-SBT-0001–0032 | 32 |
| 08 | 08 Single-engine Class B Climb | `08-single-engine-class-b-climb.json` | PERF-SBC-0001–0014 | 14 |
| 09 | 09 Single-engine Class B En Route and Descent | `09-single-engine-class-b-en-route-and-descent.json` | PERF-SBE-0001–0018 | 18 |
| 10 | 10 Single-engine Class B Landing | `10-single-engine-class-b-landing.json` | PERF-SBL-0001–0023 | 23 |
| 11 | 11 Multi-engine Class B Take-off | `11-multi-engine-class-b-take-off.json` | PERF-MBT-0001–0042 | 42 |
| 12 | 12 Multi-engine Class B En Route and Descent | `12-multi-engine-class-b-en-route-and-descent.json` | PERF-MBE-0001–0017 | 17 |
| 13 | 13 Multi-engine Class B Landing | `13-multi-engine-class-b-landing.json` | PERF-MBL-0001–0020 | 20 |
| 14 | 14 Class A Take-off | `14-class-a-take-off.json` | PERF-CAT-0001–0074 | 74 |
| 15 | 15 Class A Additional Take-off Procedures | `15-class-a-additional-take-off-procedures.json` | PERF-CAX-0001–0028 | 28 |
| 16 | 16 Class A Take-off Climb | `16-class-a-take-off-climb.json` | PERF-CAC-0001–0045 | 45 |
| 17 | 17 Class A En Route | `17-class-a-en-route.json` | PERF-CRE-0001–0049 | 49 |
| 18 | 18 Class A Landing | `18-class-a-landing.json` | PERF-CAL-0001–0031 | 31 |

### Answer-shape checks

Correct letters a/b/c/d are 194/192/191/195. The correct option is the single
longest in 17 % of questions and the single shortest in 4 %. No duplicate
stems, no "all/none of the above", no source names.

`public/perf-study-guide.html` is the study guide: eighteen chapter sections
in the same order, each with a key-idea callout, chips, tables, comparison
cards, diagrams (declared distances, drag curve, payload–range, balanced
field, take-off segments, buffet boundary) and worked examples, a Class A /
Class B cheat sheet and ten calculators (gradient and rate of climb; wind and
the ground gradient; obstacle clearance; gross to net gradient; Class B
take-off distance; landing distance required; hydroplaning speed; glide or
drift-down range; Mach number; load factor in a turn). Checked at 1280px and
375px with no horizontal overflow and no script errors.

**Instructor review needed:** the regulatory factors and gradients follow the
book, which predates some changes to the performance rules; they should be
checked against the current regulations, and the bank has not been reviewed
by a qualified instructor.

## The Instrumentation bank (Flying Knowledge)

The subject is **Instrumentation** (code `INST`, ATPL 022), added the same
content-only way and listed against 022 on the ATPL Ground School page.
1713 questions across thirty-eight topics, all published.

### Source, and what was not used

The owner supplied CAE Oxford Aviation Academy's *Instrumentation* (ATPL
ground training series, Book 5) as a text file. Its thirty-eight teaching
chapters were used in order, for their facts. Its end-of-chapter questions,
its AFCS revision chapter (31), its revision questions and specimen paper
(40) and its wording were not used as questions: at the owner's request
("use the book's questions") they were read as a **coverage checklist and a
style guide** instead. Every fact a book question tests was checked against
the bank, about seventy-five gap questions were written, and the book's
common stem forms (completion stems, numbered statements to combine) were
adopted, all in the assistant's own words with original options and
numbers. Copying or lightly reformatting the book's questions was declined
because the book forbids reproduction. Student-facing text names no book,
school, regulator, regulation, syllabus or aircraft manufacturer.

The supplied text is missing many figure-heavy pages (for example parts of
the INS, radio altimeter, flight director, GPWS and ACAS chapters). Those
gaps were filled from standard ATPL-level knowledge, and the book's own
questions were used to find them.

Choices and corrections:

- Book chapter 31 (revision questions) is skipped, so book chapters 32–39
  are topics 31–38.
- Aircraft types and manufacturers are not named: type-specific figures
  (take-off flight director pitch, THR HLD at 84 kt, autoland heights) are
  asked as "in a typical system".
- ACAS: the current software version (7.1) is used; TA/RA timing and
  height inhibitions, missing from the text, are the standard values.
- Cockpit voice recorder: 2 hours, with a note that newer large aeroplanes
  keep 25 hours; underwater locator at least 30 days.
- The book's oddities left out: a clock frequency "between 120 and 45 MHz",
  and "ILS one dot = 1°" on the EHSI.
- Approach categories use the current values (CAT II RVR 300 m, CAT IIIA
  175 m, CAT IIIB 50–175 m).

### Order and format

Topic names carry their chapter number. Inside each file the questions run in
book order, grouped by `subtopic`. Explanations are two to four sentences.
Numbered-statement questions are written inline ("(1) … (2) …") because the
test screen does not render line breaks in a stem.

| # | Topic | File | Ids | Questions |
|---|---|---|---|---|
| 01 | 01 Characteristics and General Definitions | `01-characteristics-and-general-definitions.json` | INST-CHR-0001–0027 | 27 |
| 02 | 02 Pitot and Static Sources | `02-pitot-and-static-sources.json` | INST-PST-0001–0070 | 70 |
| 03 | 03 Air Temperature Measurement | `03-air-temperature-measurement.json` | INST-TMP-0001–0059 | 59 |
| 04 | 04 The Airspeed Indicator (ASI) | `04-the-airspeed-indicator-asi.json` | INST-ASI-0001–0055 | 55 |
| 05 | 05 The Pressure Altimeter | `05-the-pressure-altimeter.json` | INST-ALT-0001–0072 | 72 |
| 06 | 06 The Vertical Speed Indicator | `06-the-vertical-speed-indicator.json` | INST-VSI-0001–0029 | 29 |
| 07 | 07 The Machmeter | `07-the-machmeter.json` | INST-MACH-0001–0055 | 55 |
| 08 | 08 Air Data Computer | `08-air-data-computer.json` | INST-ADC-0001–0029 | 29 |
| 09 | 09 Terrestrial Magnetism | `09-terrestrial-magnetism.json` | INST-TMAG-0001–0037 | 37 |
| 10 | 10 The Direct Indicating Compass | `10-the-direct-indicating-compass.json` | INST-DIC-0001–0046 | 46 |
| 11 | 11 Gyroscopes | `11-gyroscopes.json` | INST-GYR-0001–0061 | 61 |
| 12 | 12 Directional Gyro Indicator (DGI) | `12-directional-gyro-indicator-dgi.json` | INST-DGI-0001–0041 | 41 |
| 13 | 13 The Artificial Horizon | `13-the-artificial-horizon.json` | INST-AH-0001–0034 | 34 |
| 14 | 14 The Turn and Slip Indicator | `14-the-turn-and-slip-indicator.json` | INST-TSI-0001–0033 | 33 |
| 15 | 15 The Turn Co-ordinator | `15-the-turn-co-ordinator.json` | INST-TC-0001–0009 | 9 |
| 16 | 16 Aircraft Magnetism | `16-aircraft-magnetism.json` | INST-AMAG-0001–0028 | 28 |
| 17 | 17 Remote Indicating Magnetic Compass | `17-remote-indicating-magnetic-compass.json` | INST-RIMC-0001–0033 | 33 |
| 18 | 18 Inertial Navigation Systems | `18-inertial-navigation-systems.json` | INST-INS-0001–0047 | 47 |
| 19 | 19 Inertial Reference System | `19-inertial-reference-system.json` | INST-IRS-0001–0048 | 48 |
| 20 | 20 Radio Altimeter | `20-radio-altimeter.json` | INST-RA-0001–0021 | 21 |
| 21 | 21 Flight Management System | `21-flight-management-system.json` | INST-FMS-0001–0057 | 57 |
| 22 | 22 Electronic Flight Information Systems | `22-electronic-flight-information-systems.json` | INST-EFIS-0001–0065 | 65 |
| 23 | 23 Basic Computers | `23-basic-computers.json` | INST-COMP-0001–0033 | 33 |
| 24 | 24 Future Air Navigation Systems (FANS) | `24-future-air-navigation-systems-fans.json` | INST-FANS-0001–0050 | 50 |
| 25 | 25 Flight Director Systems | `25-flight-director-systems.json` | INST-FD-0001–0069 | 69 |
| 26 | 26 Autopilot | `26-autopilot.json` | INST-AP-0001–0123 | 123 |
| 27 | 27 Autoland | `27-autoland.json` | INST-ALND-0001–0078 | 78 |
| 28 | 28 Autothrottle | `28-autothrottle.json` | INST-AT-0001–0066 | 66 |
| 29 | 29 Yaw Dampers | `29-yaw-dampers.json` | INST-YD-0001–0030 | 30 |
| 30 | 30 Control Laws | `30-control-laws.json` | INST-CLAW-0001–0044 | 44 |
| 31 | 31 Flight Warning Systems | `31-flight-warning-systems.json` | INST-FWS-0001–0020 | 20 |
| 32 | 32 Aerodynamic Warnings | `32-aerodynamic-warnings.json` | INST-AERO-0001–0026 | 26 |
| 33 | 33 Ground Proximity Warning System | `33-ground-proximity-warning-system.json` | INST-GPWS-0001–0049 | 49 |
| 34 | 34 Airborne Collision Avoidance System | `34-airborne-collision-avoidance-system.json` | INST-ACAS-0001–0038 | 38 |
| 35 | 35 Flight Data Recorder | `35-flight-data-recorder.json` | INST-FDR-0001–0021 | 21 |
| 36 | 36 Cockpit Voice Recorder | `36-cockpit-voice-recorder.json` | INST-CVR-0001–0016 | 16 |
| 37 | 37 Engine Instrumentation | `37-engine-instrumentation.json` | INST-ENG-0001–0062 | 62 |
| 38 | 38 Electronic Instrumentation | `38-electronic-instrumentation.json` | INST-EIS-0001–0032 | 32 |

### Answer-shape checks

Correct letters a/b/c/d are 428/430/426/429. The correct option is the single
longest in 10 % of questions and the single shortest in 13 %. No duplicate
stems, no "all/none of the above", no source names. Every calculation was
re-worked by script.

`public/inst-study-guide.html` is the study guide: thirty-eight chapter
sections in the same order, each with a key-idea callout, chips, tables,
comparison cards, diagrams (Basic T, pitot-static system, ASI arcs, field
components, remote compass loop, autopilot inner loop, autoland profile,
TCAS symbols) and worked examples, a cheat sheet and ten calculators (TAT to
SAT; speed of sound and Mach; altimeter pressure error; altimeter
temperature error; density altitude; DGI wander; rate one turn; glide path
rate of descent; true to compass heading; compass coefficients). Checked at
1280px and 375px with no horizontal overflow and no script errors.

It has not been reviewed by a qualified instructor and should be before a
student relies on it for a real exam.

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
