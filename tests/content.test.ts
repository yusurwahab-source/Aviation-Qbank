import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { loadContent } from "@/content/load";
import { questionSchema } from "@/content/schema";

const validQuestion = {
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
};

describe("questionSchema", () => {
  it("accepts a well-formed question", () => {
    expect(questionSchema.safeParse(validQuestion).success).toBe(true);
  });

  it("rejects a correct answer that is not one of the options", () => {
    const result = questionSchema.safeParse({ ...validQuestion, correct: "d" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain("correct");
  });

  it("rejects duplicate option ids", () => {
    const result = questionSchema.safeParse({
      ...validQuestion,
      options: [
        { id: "a", text: "One" },
        { id: "a", text: "Two" },
      ],
      correct: "a",
    });
    expect(result.success).toBe(false);
  });

  it("rejects fewer than 2 or more than 5 options", () => {
    expect(
      questionSchema.safeParse({ ...validQuestion, options: [{ id: "a", text: "Only" }], correct: "a" })
        .success,
    ).toBe(false);

    const six = ["a", "b", "c", "d", "e", "f"].map((id) => ({ id, text: id }));
    expect(questionSchema.safeParse({ ...validQuestion, options: six, correct: "a" }).success).toBe(
      false,
    );
  });

  it("rejects a leftover difficulty, so the removed field cannot creep back", () => {
    expect(questionSchema.safeParse({ ...validQuestion, difficulty: 1 }).success).toBe(false);
  });

  it("rejects an unknown field, so a typo is never silently dropped", () => {
    const result = questionSchema.safeParse({ ...validQuestion, explaination: "typo" });
    expect(result.success).toBe(false);
  });

  it("rejects an id whose aircraft prefix disagrees with the aircraft field", () => {
    const result = questionSchema.safeParse({ ...validQuestion, id: "A320-ELEC-0001" });
    expect(result.success).toBe(false);
  });

  it("rejects a status that is neither draft nor published", () => {
    expect(questionSchema.safeParse({ ...validQuestion, status: "live" }).success).toBe(false);
  });
});

describe("loadContent", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  function makeContentDir(files: Record<string, unknown>): string {
    const root = mkdtempSync(path.join(tmpdir(), "qbank-content-"));
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
    code: "DA40",
    category: "light-aircraft",
    name: "Diamond DA40",
    manufacturer: "Diamond Aircraft",
    description: "Four-seat single.",
    status: "active",
    sortOrder: 10,
  };

  it("loads a valid aircraft folder", () => {
    const root = makeContentDir({
      "da40/aircraft.json": manifest,
      "da40/questions/electrical.json": [validQuestion],
    });

    const { aircraft, issues } = loadContent(root);
    expect(issues).toEqual([]);
    expect(aircraft).toHaveLength(1);
    expect(aircraft[0].manifest.code).toBe("DA40");
    expect(aircraft[0].questions).toHaveLength(1);
  });

  it("keeps draft questions but marks them as such", () => {
    const root = makeContentDir({
      "da40/aircraft.json": manifest,
      "da40/questions/electrical.json": [
        validQuestion,
        { ...validQuestion, id: "DA40-ELEC-0002", status: "draft" },
      ],
    });

    const { aircraft, issues } = loadContent(root);
    expect(issues).toEqual([]);
    expect(aircraft[0].questions.filter((q) => q.status === "published")).toHaveLength(1);
    expect(aircraft[0].questions.filter((q) => q.status === "draft")).toHaveLength(1);
  });

  it("reports a duplicate question id across files", () => {
    const root = makeContentDir({
      "da40/aircraft.json": manifest,
      "da40/questions/a.json": [validQuestion],
      "da40/questions/b.json": [validQuestion],
    });

    const { issues } = loadContent(root);
    expect(issues.some((issue) => issue.message.includes("Duplicate question id"))).toBe(true);
  });

  it("reports a folder name that does not match the aircraft code", () => {
    const root = makeContentDir({
      "diamond/aircraft.json": manifest,
      "diamond/questions/electrical.json": [validQuestion],
    });

    const { issues } = loadContent(root);
    expect(issues.some((issue) => issue.message.includes('Expected folder "da40"'))).toBe(true);
  });

  it("reports a question filed under the wrong aircraft", () => {
    const root = makeContentDir({
      "da40/aircraft.json": manifest,
      "da40/questions/electrical.json": [
        { ...validQuestion, id: "A320-ELEC-0001", aircraft: "A320" },
      ],
    });

    const { issues } = loadContent(root);
    expect(issues.length).toBeGreaterThan(0);
  });

  it("reports malformed JSON with the file name", () => {
    const root = makeContentDir({
      "da40/aircraft.json": manifest,
      "da40/questions/broken.json": "{ this is not json",
    });

    const { issues } = loadContent(root);
    expect(issues).toHaveLength(1);
    expect(issues[0].file).toContain("broken.json");
    expect(issues[0].message).toContain("Could not read or parse JSON");
  });

  it("reports an active aircraft with no questions", () => {
    const root = makeContentDir({ "da40/aircraft.json": manifest });

    const { issues } = loadContent(root);
    expect(issues.some((issue) => issue.message.includes("no question files"))).toBe(true);
  });

  it("sorts aircraft by sortOrder so the picker order is stable", () => {
    const root = makeContentDir({
      "da40/aircraft.json": { ...manifest, sortOrder: 20 },
      "da40/questions/electrical.json": [validQuestion],
      "a320/aircraft.json": {
        code: "A320",
        category: "type-rating",
        name: "Airbus A320",
        manufacturer: "Airbus",
        description: "Narrow-body twin.",
        status: "coming_soon",
        sortOrder: 10,
      },
    });

    const { aircraft, issues } = loadContent(root);
    expect(issues).toEqual([]);
    expect(aircraft.map((entry) => entry.manifest.code)).toEqual(["A320", "DA40"]);
  });

  it("loads flying-knowledge content from knowledge.json", () => {
    const root = makeContentDir({
      "flying-knowledge/knowledge.json": {
        code: "FLYKNOW",
        category: "flying-knowledge",
        name: "Flying Knowledge",
        manufacturer: "General Aviation",
        description: "Theory topics",
        status: "active",
        sortOrder: 1,
      },
      "flying-knowledge/questions/ifr.json": [
        { ...validQuestion, id: "FLYKNOW-IFR-0001", aircraft: "FLYKNOW", topic: "IFR Quiz" },
      ],
    });

    const { aircraft, issues } = loadContent(root);
    expect(issues).toEqual([]);
    expect(aircraft).toHaveLength(1);
    expect(aircraft[0].manifest.category).toBe("flying-knowledge");
    expect(aircraft[0].manifest.code).toBe("FLYKNOW");
  });
});

describe("the DA40 content in this repository", () => {
  it("is valid and has questions ready for users", () => {
    const { aircraft, issues } = loadContent();
    expect(issues).toEqual([]);

    const da40 = aircraft.find((entry) => entry.manifest.code === "DA40");
    expect(da40).toBeDefined();
    expect(da40!.questions.filter((q) => q.status === "published").length).toBeGreaterThanOrEqual(
      10,
    );
  });
});
