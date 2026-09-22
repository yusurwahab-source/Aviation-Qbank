import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { classQuestionSchema, classRatingSchema } from "@/content/class-schema";
import { loadClassContent } from "@/content/load-classes";
import { loadContent } from "@/content/load";

const validQuestion = {
  id: "SEP-SYSTEMS-0001",
  classCode: "SEP",
  topic: "Systems",
  question: "What fuel does a typical SEP trainer burn?",
  options: [
    { id: "a", text: "Jet A-1" },
    { id: "b", text: "Avgas" },
  ],
  correct: "b",
  explanation: "Most SEP trainers run on Avgas.",
  status: "published",
  version: 1,
};

describe("classQuestionSchema", () => {
  it("accepts a well-formed question", () => {
    expect(classQuestionSchema.safeParse(validQuestion).success).toBe(true);
  });

  it("rejects a correct answer that is not one of the options", () => {
    const result = classQuestionSchema.safeParse({ ...validQuestion, correct: "d" });
    expect(result.success).toBe(false);
  });

  it("rejects an id whose class prefix disagrees with the classCode field", () => {
    const result = classQuestionSchema.safeParse({ ...validQuestion, id: "MEP-SYSTEMS-0001" });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown field, the same as the aircraft question schema", () => {
    const result = classQuestionSchema.safeParse({ ...validQuestion, aircraft: "SEP" });
    expect(result.success).toBe(false);
  });
});

describe("classRatingSchema", () => {
  it("accepts a well-formed manifest", () => {
    expect(
      classRatingSchema.safeParse({
        code: "SEP",
        name: "Single-Engine Piston",
        description: "Light singles.",
        status: "active",
        sortOrder: 10,
      }).success,
    ).toBe(true);
  });

  it("allows coming_soon, the same convention aircraft.json uses", () => {
    expect(
      classRatingSchema.safeParse({
        code: "MEP",
        name: "Multi-Engine Piston",
        description: "Light twins.",
        status: "coming_soon",
        sortOrder: 20,
      }).success,
    ).toBe(true);
  });
});

describe("loadClassContent", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  function makeContentDir(files: Record<string, unknown>): string {
    const root = mkdtempSync(path.join(tmpdir(), "qbank-class-content-"));
    dirs.push(root);
    for (const [relativePath, contents] of Object.entries(files)) {
      const full = path.join(root, relativePath);
      mkdirSync(path.dirname(full), { recursive: true });
      writeFileSync(
        full,
        typeof contents === "string" ? contents : JSON.stringify(contents, null, 2),
      );
    }
    return root;
  }

  const manifest = {
    code: "SEP",
    name: "Single-Engine Piston",
    description: "Light singles.",
    status: "active",
    sortOrder: 10,
  };

  it("loads a valid class folder", () => {
    const root = makeContentDir({
      "sep/class.json": manifest,
      "sep/questions/systems.json": [validQuestion],
    });

    const { classes, issues } = loadClassContent(root);
    expect(issues).toEqual([]);
    expect(classes).toHaveLength(1);
    expect(classes[0].manifest.code).toBe("SEP");
    expect(classes[0].questions).toHaveLength(1);
  });

  it("does not error on a missing classes directory — a repository need not have any", () => {
    const root = mkdtempSync(path.join(tmpdir(), "qbank-no-classes-"));
    dirs.push(root);
    const { classes, issues } = loadClassContent(path.join(root, "does-not-exist"));
    expect(issues).toEqual([]);
    expect(classes).toEqual([]);
  });

  it("reports a duplicate question id across files", () => {
    const root = makeContentDir({
      "sep/class.json": manifest,
      "sep/questions/a.json": [validQuestion],
      "sep/questions/b.json": [validQuestion],
    });

    const { issues } = loadClassContent(root);
    expect(issues.some((issue) => issue.message.includes("Duplicate question id"))).toBe(true);
  });

  it("reports a folder name that does not match the class code", () => {
    const root = makeContentDir({
      "single-engine/class.json": manifest,
      "single-engine/questions/systems.json": [validQuestion],
    });

    const { issues } = loadClassContent(root);
    expect(issues.some((issue) => issue.message.includes('Expected folder "sep"'))).toBe(true);
  });

  it("reports an active class with no questions", () => {
    const root = makeContentDir({ "sep/class.json": manifest });

    const { issues } = loadClassContent(root);
    expect(issues.some((issue) => issue.message.includes("no question files"))).toBe(true);
  });

  it("reports a question filed under the wrong class", () => {
    const root = makeContentDir({
      "sep/class.json": manifest,
      "sep/questions/systems.json": [
        { ...validQuestion, id: "MEP-SYSTEMS-0001", classCode: "MEP" },
      ],
    });

    const { issues } = loadClassContent(root);
    expect(issues.length).toBeGreaterThan(0);
  });
});

describe("loadContent skips the classes/ directory", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it("never treats content/classes/ as an aircraft folder", () => {
    const root = mkdtempSync(path.join(tmpdir(), "qbank-mixed-content-"));
    dirs.push(root);
    mkdirSync(path.join(root, "da40", "questions"), { recursive: true });
    writeFileSync(
      path.join(root, "da40", "aircraft.json"),
      JSON.stringify({
        code: "DA40",
        name: "Diamond DA40",
        manufacturer: "Diamond Aircraft",
        description: "Four-seat single.",
        status: "active",
        sortOrder: 10,
      }),
    );
    writeFileSync(
      path.join(root, "da40", "questions", "electrical.json"),
      JSON.stringify([
        {
          id: "DA40-ELEC-0001",
          aircraft: "DA40",
          topic: "Electrical",
          question: "What is the nominal system voltage?",
          options: [
            { id: "a", text: "12 volt" },
            { id: "b", text: "28 volt" },
          ],
          correct: "b",
          explanation: "It is a 28 volt system.",
          status: "published",
          version: 1,
        },
      ]),
    );
    mkdirSync(path.join(root, "classes", "sep"), { recursive: true });
    writeFileSync(path.join(root, "classes", "sep", "class.json"), JSON.stringify({}));

    const { aircraft, issues } = loadContent(root);
    expect(issues).toEqual([]);
    expect(aircraft.map((entry) => entry.manifest.code)).toEqual(["DA40"]);
  });
});

describe("the class ratings content in this repository", () => {
  it("is valid, whether or not any bank has questions yet", () => {
    const { issues } = loadClassContent();
    expect(issues).toEqual([]);
  });

  it("has a DA40 bank with questions ready for users", () => {
    const { classes, issues } = loadClassContent();
    expect(issues).toEqual([]);

    const da40 = classes.find((entry) => entry.manifest.code === "DA40");
    expect(da40).toBeDefined();
    expect(
      da40!.questions.filter((q) => q.status === "published").length,
    ).toBeGreaterThanOrEqual(10);
  });
});
