/**
 * Imports the F AIR multiple-choice bank into Flying Knowledge.
 *
 *   npm run import:f-air -- --dry-run   Validate and print counts; write nothing
 *   npm run import:f-air                Write content/flying-knowledge/fair/
 *   npm run db:seed                     Then load it into the database
 *
 * Content is the source of truth in this repository, so the import writes
 * content files rather than database rows — a row written straight to the
 * database would be deleted by the next seed. `db:seed` upserts by question
 * id, so the whole path is safe to repeat: running this twice in a row
 * changes nothing the second time, and no other subject's questions are
 * read, written or deleted.
 *
 * The folder is owned by this script. It refuses to run if
 * `content/flying-knowledge/fair/questions/` holds a file it did not
 * generate, rather than deleting it.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  F_AIR_SOURCE_KEY,
  F_AIR_SUBJECT,
  FAirImportError,
  buildFAirFiles,
  countFAirByTopic,
  type FAirBuild,
} from "../src/content/f-air-import";

const DEFAULT_SOURCE = path.join("sources", "f-air", "F-AIR-MCQ-Bank-500plus.json");
const CORRECTIONS = path.join("sources", "f-air", "corrections.json");
const TARGET_DIR = path.join("content", "flying-knowledge", F_AIR_SUBJECT.code.toLowerCase());

function readJson(file: string): unknown {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    console.error(`Could not read ${file}: ${(error as Error).message}`);
    process.exit(1);
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const sourceFlag = args.indexOf("--source");
  const sourceFile = sourceFlag >= 0 ? args[sourceFlag + 1] : DEFAULT_SOURCE;
  if (!sourceFile) {
    console.error("--source needs a path");
    process.exit(1);
  }

  const source = readJson(sourceFile);
  const corrections = readJson(CORRECTIONS);

  let build: FAirBuild;
  try {
    build = buildFAirFiles(source, corrections);
  } catch (error) {
    if (error instanceof FAirImportError) {
      console.error(error.message);
      console.error("\nNothing was written.");
      process.exit(1);
    }
    throw error;
  }
  const { files, rows, correctedIds } = build;

  console.log(`\n${F_AIR_SOURCE_KEY}: ${sourceFile}`);
  console.log(`Subject ${F_AIR_SUBJECT.code} — ${F_AIR_SUBJECT.name}\n`);

  const width = Math.max(...countFAirByTopic(rows).map(({ topic }) => topic.source.length));
  for (const { topic, count } of countFAirByTopic(rows)) {
    console.log(`  ${topic.source.padEnd(width)}  ${String(count).padStart(4)}   → ${topic.file}`);
  }
  console.log(`  ${"TOTAL".padEnd(width)}  ${String(rows.length).padStart(4)}\n`);

  const letters = new Map<string, number>();
  for (const row of rows) letters.set(row.correct, (letters.get(row.correct) ?? 0) + 1);
  console.log(
    `  Correct answer as authored: ${["A", "B", "C", "D"].map((l) => `${l} ${letters.get(l) ?? 0}`).join(" · ")}`,
  );
  console.log(`  Questions changed by ${CORRECTIONS}: ${correctedIds.size}\n`);

  const questionsDir = path.join(TARGET_DIR, "questions");
  const expected = new Set([...files.keys()].map((file) => path.join(TARGET_DIR, file)));
  const strays = existsSync(questionsDir)
    ? readdirSync(questionsDir)
        .map((entry) => path.join(questionsDir, entry))
        .filter((file) => !expected.has(file))
    : [];
  if (strays.length > 0) {
    console.error(`${questionsDir} holds files this import does not generate:`);
    for (const file of strays) console.error(`  ${file}`);
    console.error("Move or remove them by hand first. Nothing was written.");
    process.exit(1);
  }

  let changed = 0;
  for (const [relative, contents] of files) {
    const file = path.join(TARGET_DIR, relative);
    const current = existsSync(file) ? readFileSync(file, "utf8") : null;
    const state = current === null ? "new" : current === contents ? "unchanged" : "updated";
    if (state !== "unchanged") changed += 1;

    if (!dryRun && state !== "unchanged") {
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, contents, "utf8");
    }
    console.log(`  ${dryRun && state !== "unchanged" ? `would be ${state}` : state}  ${file}`);
  }

  if (dryRun) {
    console.log(`\nDry run: nothing was written (${changed} file(s) would change).\n`);
  } else {
    console.log(
      `\n${changed} file(s) written. Run \`npm run db:seed\` to load them into the database.\n`,
    );
  }
}

main();
