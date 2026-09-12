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
  a320/                     <- adding an aircraft means adding a folder
    aircraft.json
    questions/
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

## Which aircraft this bank is for

The aircraft is the **Diamond DA 40 D TDI** — the diesel variant with the
TAE 125 engine, running on Jet A-1.

The folder and the code stay `da40` / `DA40`. Only the display name changed. The
code is the URL segment, the prefix of every question id, and the value stored on
every past attempt, so changing it would break links and orphan history for no
gain.

## Drafted content, and why

Two sets of questions are `draft`, so they are kept but never shown:

- **All three `Powerplant` questions.** They describe a Lycoming IO-360 piston
  engine running on AVGAS. The fuel questions describe a diesel that must never
  see AVGAS. Both cannot be true of one aircraft, and showing a pilot both would
  be worse than showing neither. They need rewriting for the TAE 125 before they
  go back.
- **`DA40-FUEL-0001` and `DA40-FUEL-0002`.** Superseded by the fuller set:
  0001 duplicates 0102 and 0103, 0002 duplicates 0106.

Nothing was deleted. Flip `status` back to `published` to restore any of them.

## About the question set

The 16 `Fuel System` questions came from the owner's own source file. They have
no `reference` yet — adding the AFM section and page to each would make them
markedly more useful to a student.

The remaining `Airframe`, `Electrical` and `Flight Controls` questions were
written to exercise the system and cover facts that are stable across DA40
variants. They have not been checked against the DA 40 D AFM specifically, and
should be before anyone studies from them.
