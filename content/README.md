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

## About the DA40 sample questions

These 11 questions are a **starter set written to exercise the system**, not a
verified training product. They cover facts that are stable across DA40-180
variants, but before this bank is used for real study every question should be
checked against the Airplane Flight Manual for the specific airframe and serial
number, and the `reference` field should be made precise (section and page).

The `reference` fields currently point at AFM sections by name rather than page
number for that reason.
