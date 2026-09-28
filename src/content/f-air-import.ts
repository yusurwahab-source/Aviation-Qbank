import { z } from "zod";

import {
  flyingKnowledgeQuestionSchema,
  flyingKnowledgeSubjectSchema,
  type FlyingKnowledgeQuestion,
  type FlyingKnowledgeSubjectManifest,
} from "./flying-knowledge-schema";

/**
 * Converts the F AIR multiple-choice bank (`sources/f-air/`) into Flying
 * Knowledge content files under `content/flying-knowledge/fair/`.
 *
 * Pure: no file system, no database. `scripts/import-f-air.ts` reads the
 * source and writes the result; `db:seed` then upserts it by id like every
 * other content file. The whole path is idempotent because the output is a
 * deterministic function of the source file and `corrections.json` — the
 * same inputs always produce byte-identical files, and a test asserts that
 * the committed files are exactly what this module produces.
 *
 * The source key the owner asked for ("F-AIR-2026" + source id) is kept in
 * two places: every question id ends in the source id, zero-padded
 * (`FAIR-ALAW-0017` is source question 17), and every question carries the
 * `F-AIR-2026` tag.
 */

export const F_AIR_SOURCE_KEY = "F-AIR-2026";
export const F_AIR_SUBJECT_CODE = "FAIR";
/** Tag on every question that `corrections.json` changed, so the owner can
 * find exactly the ones that differ from the source file. */
export const F_AIR_CORRECTED_TAG = "f-air-corrected";

export const F_AIR_SUBJECT: FlyingKnowledgeSubjectManifest = {
  code: F_AIR_SUBJECT_CODE,
  name: "FI(A) Course Theory — F AIR",
  description:
    "Theory for the aeroplane flight instructor course at F AIR, Benešov (LKBE): SERA and Part-FCL air law with Czech airspace and LKBE local rules, flight time limitations, piston engine and C152 systems, performance and mass and balance, navigation and radio navigation, VFR procedures and emergencies, and human performance and instructional technique.",
  status: "active",
  sortOrder: 30,
};

/**
 * Where each source topic lands. The source topic name is the key and must
 * match exactly; the display name is title-cased to sit beside the other
 * Flying Knowledge subjects, and the code is the middle segment of the id.
 */
export const F_AIR_TOPICS = [
  { source: "AIR LAW", topic: "Air Law", code: "ALAW", file: "air-law.json" },
  {
    source: "AIRFRAME, SYSTEMS & ENGINES",
    topic: "Airframe, Systems & Engines",
    code: "ASE",
    file: "airframe-systems-engines.json",
  },
  {
    source: "NAVIGATION & RADIONAVIGATION",
    topic: "Navigation & Radionavigation",
    code: "NAV",
    file: "navigation-radionavigation.json",
  },
  { source: "VFR PROCEDURES", topic: "VFR Procedures", code: "VFR", file: "vfr-procedures.json" },
  { source: "HUMAN PERFORMANCE", topic: "Human Performance", code: "HP", file: "human-performance.json" },
] as const;

export type FAirTopic = (typeof F_AIR_TOPICS)[number];

const LETTERS = ["A", "B", "C", "D"] as const;
type Letter = (typeof LETTERS)[number];

const nonEmpty = (what: string) => z.string().trim().min(1, `${what} is empty`);

/** One row of the source file. Strict, so exactly the options A–D are
 * accepted: a missing D or an extra E fails, as does any unexpected field. */
export const fAirSourceRowSchema = z.strictObject({
  id: z.int().positive(),
  topic: z.string(),
  subtopic: nonEmpty("subtopic"),
  question: nonEmpty("question"),
  options: z.strictObject({
    A: nonEmpty("option A"),
    B: nonEmpty("option B"),
    C: nonEmpty("option C"),
    D: nonEmpty("option D"),
  }),
  correct: z.enum(LETTERS, { error: '"correct" must be one of A, B, C, D' }),
  explanation: nonEmpty("explanation"),
});

export type FAirSourceRow = z.infer<typeof fAirSourceRowSchema>;

const CORRECTION_FIELDS = [
  "question",
  "correct",
  "explanation",
  "options.A",
  "options.B",
  "options.C",
  "options.D",
] as const;

export const fAirCorrectionSchema = z.strictObject({
  id: z.int().positive(),
  field: z.enum(CORRECTION_FIELDS),
  from: z.string(),
  to: z.string().trim().min(1),
  reason: z.string().trim().min(1),
});

export const fAirCorrectionsSchema = z.array(fAirCorrectionSchema);

export type FAirCorrection = z.infer<typeof fAirCorrectionSchema>;

/** A problem that stops the import. `row` is the 1-based position in the
 * source array — the number to look for when fixing the file. */
export type FAirIssue = { row: number | null; id: number | null; message: string };

export class FAirImportError extends Error {
  constructor(readonly issues: FAirIssue[]) {
    super(
      `F AIR import failed:\n${issues
        .map((issue) => {
          const where = [
            issue.row === null ? null : `row ${issue.row}`,
            issue.id === null ? null : `id ${issue.id}`,
          ]
            .filter(Boolean)
            .join(", ");
          return `  ${where ? `${where}: ` : ""}${issue.message}`;
        })
        .join("\n")}`,
    );
    this.name = "FAirImportError";
  }
}

/**
 * Validates the raw source. Never partially succeeds: every problem in the
 * file is collected and reported together, each with its row number.
 */
export function parseFAirSource(data: unknown): FAirSourceRow[] {
  if (!Array.isArray(data)) {
    throw new FAirImportError([{ row: null, id: null, message: "The source must be a JSON array" }]);
  }

  const issues: FAirIssue[] = [];
  const rows: FAirSourceRow[] = [];
  const seenIds = new Map<number, number>();
  const knownTopics = new Set<string>(F_AIR_TOPICS.map((t) => t.source));

  data.forEach((raw, index) => {
    const row = index + 1;
    const rawId =
      raw && typeof raw === "object" && typeof (raw as { id?: unknown }).id === "number"
        ? (raw as { id: number }).id
        : null;

    const parsed = fAirSourceRowSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
        issues.push({ row, id: rawId, message: `${path}${issue.message}` });
      }
      return;
    }

    const value = parsed.data;
    const firstRow = seenIds.get(value.id);
    if (firstRow !== undefined) {
      issues.push({ row, id: value.id, message: `duplicate id, already used on row ${firstRow}` });
      return;
    }
    seenIds.set(value.id, row);

    if (!knownTopics.has(value.topic)) {
      issues.push({
        row,
        id: value.id,
        message: `unknown topic "${value.topic}" — expected one of: ${[...knownTopics].join(" | ")}`,
      });
      return;
    }

    rows.push(value);
  });

  if (issues.length > 0) throw new FAirImportError(issues);
  return rows;
}

function readField(row: FAirSourceRow, field: FAirCorrection["field"]): string {
  if (field.startsWith("options.")) return row.options[field.slice("options.".length) as Letter];
  return row[field as "question" | "correct" | "explanation"];
}

function writeField(row: FAirSourceRow, field: FAirCorrection["field"], value: string): FAirSourceRow {
  if (field.startsWith("options.")) {
    const letter = field.slice("options.".length) as Letter;
    return { ...row, options: { ...row.options, [letter]: value } };
  }
  if (field === "correct") {
    if (!(LETTERS as readonly string[]).includes(value)) {
      throw new FAirImportError([
        { row: null, id: row.id, message: `correction sets "correct" to "${value}", not one of A–D` },
      ]);
    }
    return { ...row, correct: value as Letter };
  }
  if (field === "question") return { ...row, question: value };
  return { ...row, explanation: value };
}

/**
 * Applies the reviewed corrections. Each one names the exact text it
 * replaces, so if the source file is ever re-exported with that text changed,
 * the import stops rather than silently overwriting a newer wording.
 */
export function applyFAirCorrections(
  rows: FAirSourceRow[],
  corrections: FAirCorrection[],
): { rows: FAirSourceRow[]; correctedIds: Set<number> } {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const issues: FAirIssue[] = [];
  const seen = new Set<string>();

  for (const correction of corrections) {
    const key = `${correction.id}:${correction.field}`;
    if (seen.has(key)) {
      issues.push({ row: null, id: correction.id, message: `more than one correction for ${correction.field}` });
      continue;
    }
    seen.add(key);

    const row = byId.get(correction.id);
    if (!row) {
      issues.push({ row: null, id: correction.id, message: "correction names an id that is not in the source" });
      continue;
    }

    const current = readField(row, correction.field);
    if (current !== correction.from) {
      issues.push({
        row: null,
        id: correction.id,
        message: `correction to ${correction.field} expected ${JSON.stringify(correction.from)} but the source has ${JSON.stringify(current)} — review the correction`,
      });
      continue;
    }

    byId.set(correction.id, writeField(row, correction.field, correction.to));
  }

  if (issues.length > 0) throw new FAirImportError(issues);

  return {
    rows: rows.map((row) => byId.get(row.id) as FAirSourceRow),
    correctedIds: new Set(corrections.map((c) => c.id)),
  };
}

export function fAirQuestionId(topic: FAirTopic, sourceId: number): string {
  return `${F_AIR_SUBJECT_CODE}-${topic.code}-${String(sourceId).padStart(4, "0")}`;
}

export type FAirTopicFile = { topic: FAirTopic; questions: FlyingKnowledgeQuestion[] };

/**
 * Maps validated, corrected rows onto the Flying Knowledge question shape,
 * one file per topic in `F_AIR_TOPICS` order, questions in source order.
 * Text is carried across as-is apart from surrounding whitespace, which the
 * question schema trims on the way into the database anyway.
 */
export function convertFAirRows(
  rows: FAirSourceRow[],
  correctedIds: ReadonlySet<number> = new Set(),
): FAirTopicFile[] {
  const issues: FAirIssue[] = [];

  const files = F_AIR_TOPICS.map((topic) => {
    const questions = rows
      .filter((row) => row.topic === topic.source)
      .map((row) => {
        const question: FlyingKnowledgeQuestion = {
          id: fAirQuestionId(topic, row.id),
          subjectCode: F_AIR_SUBJECT_CODE,
          topic: topic.topic,
          subtopic: row.subtopic.trim(),
          question: row.question.trim(),
          options: LETTERS.map((letter) => ({
            id: letter.toLowerCase(),
            text: row.options[letter].trim(),
          })),
          correct: row.correct.toLowerCase(),
          explanation: row.explanation.trim(),
          tags: correctedIds.has(row.id) ? [F_AIR_SOURCE_KEY, F_AIR_CORRECTED_TAG] : [F_AIR_SOURCE_KEY],
          status: "published",
          version: 1,
        };

        const checked = flyingKnowledgeQuestionSchema.safeParse(question);
        if (!checked.success) {
          const rowNumber = rows.indexOf(row) + 1;
          for (const issue of checked.error.issues) {
            issues.push({
              row: rowNumber,
              id: row.id,
              message: `${issue.path.join(".") || "(question)"}: ${issue.message}`,
            });
          }
        }
        return question;
      });

    return { topic, questions };
  });

  if (!flyingKnowledgeSubjectSchema.safeParse(F_AIR_SUBJECT).success) {
    issues.push({ row: null, id: null, message: "the subject manifest does not match the subject schema" });
  }
  if (issues.length > 0) throw new FAirImportError(issues);

  return files;
}

/**
 * Serialises a question file in the house style used across `content/`:
 * two-space indentation, one option per line. JSON.stringify keeps non-ASCII
 * characters (°, ±, →, √, ½) as they are rather than escaping them.
 */
export function formatQuestionFile(questions: FlyingKnowledgeQuestion[]): string {
  const blocks = questions.map((question) => {
    const entries = Object.entries(question);
    const lines = entries.map(([key, value], index) => {
      const comma = index < entries.length - 1 ? "," : "";
      if (key === "options") {
        const options = question.options.map(
          (option, i) =>
            `      { "id": ${JSON.stringify(option.id)}, "text": ${JSON.stringify(option.text)} }${
              i < question.options.length - 1 ? "," : ""
            }`,
        );
        return [`    "options": [`, ...options, `    ]${comma}`].join("\n");
      }
      return `    ${JSON.stringify(key)}: ${JSON.stringify(value)}${comma}`;
    });
    return `  {\n${lines.join("\n")}\n  }`;
  });
  return `[\n${blocks.join(",\n")}\n]\n`;
}

export function formatSubjectFile(subject: FlyingKnowledgeSubjectManifest): string {
  return `${JSON.stringify(subject, null, 2)}\n`;
}

export type FAirBuild = {
  /** Everything the importer writes, keyed by path relative to the subject
   * folder (`content/flying-knowledge/fair/`). */
  files: Map<string, string>;
  /** The validated source rows, before corrections. */
  rows: FAirSourceRow[];
  correctedIds: Set<number>;
};

export function buildFAirFiles(source: unknown, corrections: unknown): FAirBuild {
  const parsedCorrections = fAirCorrectionsSchema.safeParse(corrections);
  if (!parsedCorrections.success) {
    throw new FAirImportError(
      parsedCorrections.error.issues.map((issue) => ({
        row: null,
        id: null,
        message: `corrections.json ${issue.path.join(".")}: ${issue.message}`,
      })),
    );
  }

  const rows = parseFAirSource(source);
  const corrected = applyFAirCorrections(rows, parsedCorrections.data);
  const files = convertFAirRows(corrected.rows, corrected.correctedIds);

  const out = new Map<string, string>();
  out.set("subject.json", formatSubjectFile(F_AIR_SUBJECT));
  for (const { topic, questions } of files) {
    out.set(`questions/${topic.file}`, formatQuestionFile(questions));
  }
  return { files: out, rows, correctedIds: corrected.correctedIds };
}

/** Counts per source topic, in `F_AIR_TOPICS` order — what `--dry-run` prints. */
export function countFAirByTopic(rows: FAirSourceRow[]): { topic: FAirTopic; count: number }[] {
  return F_AIR_TOPICS.map((topic) => ({
    topic,
    count: rows.filter((row) => row.topic === topic.source).length,
  }));
}
