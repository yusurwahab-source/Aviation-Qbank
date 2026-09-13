# Question content

Questions live here as JSON files, not in the database. The database is filled
from these files by `npm run db:seed`, so **these files are the source of
truth**. Edit a file, re-run the seed, and the website updates.

## Folder layout

```
content/
  da40/                     <- one folder per aircraft, lowercase code
    aircraft.json           <- the aircraft's details
    questions/
      airframe.json         <- one file per topic, each holding a JSON array
      electrical.json
      ...
  b737/                     <- adding an aircraft means adding a folder
    aircraft.json
    questions/
      airplane-general.json  <- one file per FCOM chapter
      air-systems.json
```

Adding a second aircraft is a content job only. Nothing in the application code
needs to change.

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
- `difficulty` is 1, 2 or 3.
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

The folder and the code stay `da40` / `DA40`. Only the display name changed. The
code is the URL segment, the prefix of every question id, and the value stored on
every past attempt, so changing it would break links and orphan history for no
gain.

### Drafted content, and why

Two sets of questions are `draft`, so they are kept but never shown:

- **All three `Powerplant` questions.** They describe a Lycoming IO-360 piston
  engine running on AVGAS. The fuel questions describe a diesel that must never
  see AVGAS. Both cannot be true of one aircraft, and showing a pilot both would
  be worse than showing neither. They need rewriting for the TAE 125 before they
  go back.
- **`DA40-FUEL-0001` and `DA40-FUEL-0002`.** Superseded by the fuller set:
  0001 duplicates 0102 and 0103, 0002 duplicates 0106.

Nothing was deleted. Flip `status` back to `published` to restore any of them.

### About the question set

The 16 `Fuel System` questions came from the owner's own source file. They have
no `reference` yet — adding the AFM section and page to each would make them
markedly more useful to a student.

The remaining `Airframe`, `Electrical` and `Flight Controls` questions were
written to exercise the system and cover facts that are stable across DA40
variants. They have not been checked against the DA 40 D AFM specifically, and
should be before anyone studies from them.

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

All published.

### What changed on the way in from the source file

Each section arrives as a CSV, one row per question. Two things in them cannot
be carried across as they are, and both are handled the same way every time:

- **Question numbers are three digits** (`B738-GEN-001`); the schema requires
  four. They are padded (`B737-GEN-0001`), which keeps the source ordering
  exactly and leaves room for a section to grow past 999.
- **Some ids carry an `L` marker** (`B738-GEN-L005`). An id has no room for
  it — the last segment must be digits. The marker means one thing in both
  sections so far: every marked question, and no unmarked one, is a figure
  that varies by operator or configuration and says so in its explanation
  ("Verify against your operator FCOM"). So it survives as a tag,
  **`verify-fcom`** — queryable, rather than buried in prose. 13 questions
  carry it: 7 in Airplane General, 6 in Air Systems.

The source files also name the aircraft `B738`; that is rewritten to the bank's
code on the way in.

Nothing else was altered on the way in. Question text, option text, correct
answers, difficulty and explanations are byte-for-byte what the source file
held; this was checked field by field after conversion, not assumed. The one
later change is the order options appear in within a question, which is its own
deliberate decision — see below.

### The correct answer is spread evenly across A-D

Both source files lean hard on one letter: Airplane General answered `B` in 32
of 52 and `D` in none, Air Systems answered `A` in 36 of 67 and `D` in none. A
student who noticed could score well above their real knowledge without knowing
the aircraft. So the options are redistributed as each section comes in:

| Section | As authored | As published |
|---|---|---|
| Airplane General | A 14 · B 32 · C 6 · D 0 | A 13 · B 13 · C 13 · D 13 |
| Air Systems | A 36 · B 30 · C 1 · D 0 | A 17 · B 17 · C 17 · D 16 |
| **Whole bank** | **A 50 · B 62 · C 7 · D 0** | **A 30 · B 30 · C 30 · D 29** |

119 does not divide by four, so one letter carries one fewer. That is the
closest an even spread gets.

Only the *order* of the options changes. Every question keeps the same four
option texts and the same correct answer — the sentence that was right in the
source is still the one marked right, it has simply moved — and the distractors
keep their relative order, so each question reads as its author wrote it. This
is asserted field by field against the source CSV, not assumed.

**Questions whose options carry their own order are left alone**, because
scrambling them would make them harder to read for nothing: ascending
magnitudes (counts, durations, altitudes, pressures, rates, dimensions), the
No. 1 / No. 2 / No. 3 window numbering in `GEN-0016`, and the compressor-stage
progression in `AIR-0002`. Sixteen questions in total. The even split is
reached around them.

One consequence in Airplane General is worth recording so it is not mistaken
for an oversight: `GEN-0043`, `0044` and `0045` sit together in the file, all
answer `C`, and each is a dimension whose true value falls third in an
ascending list of four. No consistent ordering can break that run. It costs
nothing in practice, because `pickTestQuestions` draws with `order by
random()` — the order questions sit in a file is never the order a student
meets them in. Air Systems has no run of three at all.

**Keep this property when adding a section.** An even spread is only worth
having if the next chapter does not undo it, and the arithmetic is over the
whole bank, not one file.

The questions have no `reference` yet. Adding the FCOM chapter and page to each
would make them markedly more useful, and none was invented during conversion.
