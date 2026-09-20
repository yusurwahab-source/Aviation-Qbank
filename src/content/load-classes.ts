import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

import {
  classQuestionFileSchema,
  classRatingSchema,
  type ClassQuestion,
  type ClassRatingManifest,
} from "./class-schema";

/**
 * Loads and validates every question file under `content/classes/`.
 *
 * A near-mirror of `load.ts`: `content/classes/<code>/class.json` holds one
 * manifest plus a `questions/` folder of JSON files, exactly as an
 * aircraft's `content/<code>/aircraft.json` does. Kept as its own module
 * rather than folded into `loadContent` because the two content trees stay
 * genuinely separate all the way down — see the note on `classRatings` in
 * `db/schema.ts`.
 */

export const CLASSES_CONTENT_DIR = path.join(process.cwd(), "content", "classes");

export type ContentIssue = { file: string; path: string; message: string };

export type ClassContent = {
  manifest: ClassRatingManifest;
  questions: ClassQuestion[];
  sources: Map<string, string>;
};

export type ClassContentLoadResult = {
  classes: ClassContent[];
  issues: ContentIssue[];
};

function relative(file: string): string {
  return path.relative(process.cwd(), file);
}

function issuesFrom(file: string, error: z.ZodError): ContentIssue[] {
  return error.issues.map((issue) => ({
    file: relative(file),
    path: issue.path.length > 0 ? issue.path.join(".") : "(root)",
    message: issue.message,
  }));
}

function readJson(file: string): { data: unknown } | { error: ContentIssue } {
  try {
    return { data: JSON.parse(readFileSync(file, "utf8")) };
  } catch (error) {
    return {
      error: {
        file: relative(file),
        path: "(file)",
        message: `Could not read or parse JSON: ${(error as Error).message}`,
      },
    };
  }
}

function listDirs(dir: string): string[] {
  return readdirSync(dir)
    .filter((entry) => !entry.startsWith(".") && statSync(path.join(dir, entry)).isDirectory())
    .sort();
}

function listJsonFiles(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((entry) => entry.endsWith(".json"))
      .sort()
      .map((entry) => path.join(dir, entry));
  } catch {
    return [];
  }
}

/**
 * Reads every class folder under `content/classes/`. Never throws for bad
 * content: problems come back in `issues`, the same contract `loadContent`
 * keeps. An entirely missing `content/classes/` directory is not itself an
 * error — unlike `content/`, there is no requirement that a class rating
 * exist at all, so a repository with none yet loads cleanly with zero
 * classes rather than failing the build.
 */
export function loadClassContent(contentDir: string = CLASSES_CONTENT_DIR): ClassContentLoadResult {
  const issues: ContentIssue[] = [];
  const classes: ClassContent[] = [];
  const seenIds = new Map<string, string>();
  const seenCodes = new Map<string, string>();

  let folders: string[];
  try {
    folders = listDirs(contentDir);
  } catch {
    return { classes, issues };
  }

  for (const folder of folders) {
    const dir = path.join(contentDir, folder);
    const manifestFile = path.join(dir, "class.json");

    const manifestJson = readJson(manifestFile);
    if ("error" in manifestJson) {
      issues.push(manifestJson.error);
      continue;
    }

    const manifestResult = classRatingSchema.safeParse(manifestJson.data);
    if (!manifestResult.success) {
      issues.push(...issuesFrom(manifestFile, manifestResult.error));
      continue;
    }
    const manifest = manifestResult.data;

    if (folder !== manifest.code.toLowerCase()) {
      issues.push({
        file: relative(manifestFile),
        path: "code",
        message: `Folder is "${folder}" but the class code is "${manifest.code}". Expected folder "${manifest.code.toLowerCase()}".`,
      });
    }

    const codeOwner = seenCodes.get(manifest.code);
    if (codeOwner) {
      issues.push({
        file: relative(manifestFile),
        path: "code",
        message: `Class code "${manifest.code}" is already defined in ${codeOwner}`,
      });
      continue;
    }
    seenCodes.set(manifest.code, relative(manifestFile));

    const questions: ClassQuestion[] = [];
    const sources = new Map<string, string>();
    const questionFiles = listJsonFiles(path.join(dir, "questions"));

    if (questionFiles.length === 0 && manifest.status === "active") {
      issues.push({
        file: relative(path.join(dir, "questions")),
        path: "(directory)",
        message: `Class ${manifest.code} is "active" but has no question files`,
      });
    }

    for (const file of questionFiles) {
      const json = readJson(file);
      if ("error" in json) {
        issues.push(json.error);
        continue;
      }

      if (!Array.isArray(json.data)) {
        issues.push({
          file: relative(file),
          path: "(root)",
          message: "A question file must contain a JSON array of questions",
        });
        continue;
      }

      const parsed = classQuestionFileSchema.safeParse(json.data);
      if (!parsed.success) {
        issues.push(...issuesFrom(file, parsed.error));
        continue;
      }

      for (const question of parsed.data) {
        if (question.classCode !== manifest.code) {
          issues.push({
            file: relative(file),
            path: `${question.id}.classCode`,
            message: `Question is in the ${manifest.code} folder but declares classCode "${question.classCode}"`,
          });
          continue;
        }

        const owner = seenIds.get(question.id);
        if (owner) {
          issues.push({
            file: relative(file),
            path: `${question.id}.id`,
            message: `Duplicate question id, already used in ${owner}`,
          });
          continue;
        }

        seenIds.set(question.id, relative(file));
        sources.set(question.id, relative(file));
        questions.push(question);
      }
    }

    classes.push({ manifest, questions, sources });
  }

  classes.sort(
    (a, b) =>
      a.manifest.sortOrder - b.manifest.sortOrder || a.manifest.code.localeCompare(b.manifest.code),
  );

  return { classes, issues };
}

/** Loads class content and throws a readable error if anything is wrong. */
export function loadClassContentOrThrow(contentDir: string = CLASSES_CONTENT_DIR): ClassContent[] {
  const { classes, issues } = loadClassContent(contentDir);
  if (issues.length > 0) {
    const lines = issues.map((issue) => `  ${issue.file} → ${issue.path}: ${issue.message}`);
    throw new Error(`Class content validation failed:\n${lines.join("\n")}`);
  }
  return classes;
}
