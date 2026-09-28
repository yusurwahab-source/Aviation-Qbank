import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  F_AIR_CORRECTED_TAG,
  F_AIR_SOURCE_KEY,
  F_AIR_SUBJECT,
  FAirImportError,
  applyFAirCorrections,
  buildFAirFiles,
  convertFAirRows,
  countFAirByTopic,
  parseFAirSource,
  type FAirSourceRow,
} from "@/content/f-air-import";
import { loadFlyingKnowledgeContent } from "@/content/load-flying-knowledge";

const SOURCE_FILE = path.join(process.cwd(), "sources", "f-air", "F-AIR-MCQ-Bank-500plus.json");
const CORRECTIONS_FILE = path.join(process.cwd(), "sources", "f-air", "corrections.json");
const SUBJECT_DIR = path.join(process.cwd(), "content", "flying-knowledge", "fair");

const readJson = (file: string): unknown => JSON.parse(readFileSync(file, "utf8"));

const row = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 1,
  topic: "AIR LAW",
  subtopic: "Rules of the Air (SERA)",
  question: "Two aircraft converge at approximately the same level. The other aircraft is on your right. Who gives way?",
  options: { A: "The faster aircraft", B: "The one at the lower altitude", C: "You", D: "The other aircraft" },
  correct: "C",
  explanation: "the aircraft that has the other on its right gives way.",
  ...overrides,
});

function issuesOf(fn: () => unknown): string[] {
  try {
    fn();
  } catch (error) {
    if (error instanceof FAirImportError) return error.message.split("\n").slice(1);
    throw error;
  }
  throw new Error("expected the import to fail");
}

describe("parseFAirSource", () => {
  it("accepts a well-formed row", () => {
    expect(parseFAirSource([row()])).toHaveLength(1);
  });

  it("requires exactly four options A-D, naming the row", () => {
    const missingD = issuesOf(() =>
      parseFAirSource([row(), row({ id: 2, options: { A: "a", B: "b", C: "c" } })]),
    );
    expect(missingD.join("\n")).toMatch(/row 2, id 2: options\.D/);

    const extraE = issuesOf(() =>
      parseFAirSource([row({ options: { A: "a", B: "b", C: "c", D: "d", E: "e" } })]),
    );
    expect(extraE.join("\n")).toMatch(/row 1, id 1: options/);
  });

  it("rejects a correct answer outside A-D", () => {
    expect(issuesOf(() => parseFAirSource([row({ correct: "E" })])).join("\n")).toMatch(
      /row 1, id 1: correct/,
    );
    expect(issuesOf(() => parseFAirSource([row({ correct: "c" })])).join("\n")).toMatch(/correct/);
  });

  it("rejects an empty question or explanation", () => {
    expect(issuesOf(() => parseFAirSource([row({ question: "   " })])).join("\n")).toMatch(
      /question is empty/,
    );
    expect(issuesOf(() => parseFAirSource([row({ explanation: "" })])).join("\n")).toMatch(
      /explanation is empty/,
    );
  });

  it("rejects duplicate ids and unknown topics", () => {
    expect(issuesOf(() => parseFAirSource([row(), row()])).join("\n")).toMatch(
      /row 2, id 1: duplicate id, already used on row 1/,
    );
    expect(issuesOf(() => parseFAirSource([row({ topic: "METEOROLOGY" })])).join("\n")).toMatch(
      /unknown topic "METEOROLOGY"/,
    );
  });

  it("reports every bad row at once, not just the first", () => {
    const issues = issuesOf(() =>
      parseFAirSource([row({ correct: "X" }), row({ id: 2 }), row({ id: 3, question: "" })]),
    );
    expect(issues.some((line) => line.includes("row 1"))).toBe(true);
    expect(issues.some((line) => line.includes("row 3"))).toBe(true);
  });
});

describe("applyFAirCorrections", () => {
  const rows = parseFAirSource([row()]) as FAirSourceRow[];

  it("replaces the named text and records which question changed", () => {
    const result = applyFAirCorrections(rows, [
      { id: 1, field: "options.D", from: "The other aircraft", to: "The aircraft on the right", reason: "test" },
      { id: 1, field: "correct", from: "C", to: "B", reason: "test" },
    ]);
    expect(result.rows[0].options.D).toBe("The aircraft on the right");
    expect(result.rows[0].correct).toBe("B");
    expect([...result.correctedIds]).toEqual([1]);
  });

  it("refuses a correction whose source text has changed", () => {
    expect(
      issuesOf(() =>
        applyFAirCorrections(rows, [
          { id: 1, field: "question", from: "Something else", to: "New", reason: "test" },
        ]),
      ).join("\n"),
    ).toMatch(/expected "Something else"/);
  });

  it("refuses a correction for an unknown id, or two for one field", () => {
    expect(
      issuesOf(() =>
        applyFAirCorrections(rows, [{ id: 99, field: "question", from: "", to: "x", reason: "t" }]),
      ).join("\n"),
    ).toMatch(/not in the source/);
    expect(
      issuesOf(() =>
        applyFAirCorrections(rows, [
          { id: 1, field: "correct", from: "C", to: "B", reason: "t" },
          { id: 1, field: "correct", from: "C", to: "D", reason: "t" },
        ]),
      ).join("\n"),
    ).toMatch(/more than one correction/);
  });
});

describe("convertFAirRows", () => {
  it("maps a row onto the Flying Knowledge question shape", () => {
    const [airLaw] = convertFAirRows(parseFAirSource([row({ id: 17 })]));
    expect(airLaw.topic.file).toBe("air-law.json");
    expect(airLaw.questions[0]).toEqual({
      id: "FAIR-ALAW-0017",
      subjectCode: "FAIR",
      topic: "Air Law",
      subtopic: "Rules of the Air (SERA)",
      question:
        "Two aircraft converge at approximately the same level. The other aircraft is on your right. Who gives way?",
      options: [
        { id: "a", text: "The faster aircraft" },
        { id: "b", text: "The one at the lower altitude" },
        { id: "c", text: "You" },
        { id: "d", text: "The other aircraft" },
      ],
      correct: "c",
      explanation: "the aircraft that has the other on its right gives way.",
      tags: [F_AIR_SOURCE_KEY],
      status: "published",
      version: 1,
    });
  });

  it("tags corrected questions so they can be found", () => {
    const [airLaw] = convertFAirRows(parseFAirSource([row()]), new Set([1]));
    expect(airLaw.questions[0].tags).toEqual([F_AIR_SOURCE_KEY, F_AIR_CORRECTED_TAG]);
  });
});

describe("the committed F AIR bank", () => {
  const source = readJson(SOURCE_FILE);
  const corrections = readJson(CORRECTIONS_FILE);
  const build = buildFAirFiles(source, corrections);

  it("has the 535 questions the owner expects, split as expected", () => {
    expect(build.rows).toHaveLength(535);
    expect(
      Object.fromEntries(countFAirByTopic(build.rows).map(({ topic, count }) => [topic.source, count])),
    ).toEqual({
      "AIR LAW": 150,
      "AIRFRAME, SYSTEMS & ENGINES": 110,
      "NAVIGATION & RADIONAVIGATION": 90,
      "VFR PROCEDURES": 100,
      "HUMAN PERFORMANCE": 85,
    });
  });

  it("is exactly what the importer produces — so re-running it changes nothing", () => {
    for (const [relative, contents] of build.files) {
      expect(readFileSync(path.join(SUBJECT_DIR, relative), "utf8"), relative).toBe(contents);
    }
    const onDisk = readdirSync(path.join(SUBJECT_DIR, "questions")).map((f) => `questions/${f}`);
    expect(new Set([...onDisk, "subject.json"])).toEqual(new Set(build.files.keys()));
    expect(existsSync(path.join(SUBJECT_DIR, "subject.json"))).toBe(true);
  });

  it("loads cleanly as a Flying Knowledge subject, every question published", () => {
    const { subjects, issues } = loadFlyingKnowledgeContent();
    expect(issues).toEqual([]);
    const fair = subjects.find((s) => s.manifest.code === F_AIR_SUBJECT.code);
    expect(fair?.questions).toHaveLength(535);
    expect(fair?.questions.every((q) => q.status === "published")).toBe(true);
  });

  it("keeps every uncorrected question's text exactly as the source wrote it", () => {
    const { subjects } = loadFlyingKnowledgeContent();
    const byId = new Map(
      subjects.find((s) => s.manifest.code === F_AIR_SUBJECT.code)!.questions.map((q) => [q.id, q]),
    );
    const sourceRows = parseFAirSource(source);
    let checked = 0;
    for (const sourceRow of sourceRows) {
      if (build.correctedIds.has(sourceRow.id)) continue;
      const suffix = `-${String(sourceRow.id).padStart(4, "0")}`;
      const question = [...byId.values()].find((q) => q.id.endsWith(suffix))!;
      expect(question.question).toBe(sourceRow.question.trim());
      expect(question.explanation).toBe(sourceRow.explanation.trim());
      expect(question.correct).toBe(sourceRow.correct.toLowerCase());
      expect(question.options.map((o) => o.text)).toEqual(
        (["A", "B", "C", "D"] as const).map((l) => sourceRow.options[l].trim()),
      );
      checked += 1;
    }
    expect(checked).toBe(535 - build.correctedIds.size);
  });

  it("keeps the C152 flap question in line with the repository's own POH-sourced bank", () => {
    const { subjects } = loadFlyingKnowledgeContent();
    const flaps = subjects
      .find((s) => s.manifest.code === F_AIR_SUBJECT.code)!
      .questions.find((q) => q.id === "FAIR-ASE-0225")!;
    expect(flaps.options.find((o) => o.id === flaps.correct)?.text).toBe("Electric");
  });
});
