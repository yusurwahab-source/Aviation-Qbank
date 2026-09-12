import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

import {
  aircraftSchema,
  questionFileSchema,
  type AircraftManifest,
  type Question,
} from "./schema";

/**
 * Loads and validates every question file in `/content`.
 *
 * Content lives in the repository, not the database: `/content/<aircraft>/`
 * holds one `aircraft.json` manifest plus a `questions/` folder of JSON files.
 * The seed script copies validated content into Postgres; nothing reads these
 * files at request time.
 */

export const CONTENT_DIR = path.join(process.cwd(), "content");

export type ContentIssue = {
  file: string;
  path: string;
  message: string;
};

export type AircraftContent = {
  manifest: AircraftManifest;
  questions: Question[];
  /** Source file for each question id, used to point at the right file in errors. */
  sources: Map<string, string>;
};

export type ContentLoadResult = {
  aircraft: AircraftContent[];
  issues: ContentIssue[];
};

function relative(file: string): string {
  return path.relative(process.cwd(), file);
}

function issuesFrom(file: string, error: z.ZodError, prefix = ""): ContentIssue[] {
  return error.issues.map((issue) => ({
    file: relative(file),
    path: prefix + (issue.path.length > 0 ? issue.path.join(".") : "(root)"),
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
 * Reads every aircraft folder under `/content`. Never throws for bad content:
 * problems come back in `issues` so the caller can report all of them at once.
 */
export function loadContent(contentDir: string = CONTENT_DIR): ContentLoadResult {
  const issues: ContentIssue[] = [];
  const aircraft: AircraftContent[] = [];
  const seenIds = new Map<string, string>();
  const seenCodes = new Map<string, string>();

  let folders: string[];
  try {
    folders = listDirs(contentDir);
  } catch (error) {
    return {
      aircraft,
      issues: [
        {
          file: relative(contentDir),
          path: "(directory)",
          message: `Content directory could not be read: ${(error as Error).message}`,
        },
      ],
    };
  }

  if (folders.length === 0) {
    issues.push({
      file: relative(contentDir),
      path: "(directory)",
      message: "No aircraft folders found. Expected at least one, e.g. content/da40/",
    });
  }

  for (const folder of folders) {
    const dir = path.join(contentDir, folder);
    const manifestFile = path.join(dir, "aircraft.json");

    const manifestJson = readJson(manifestFile);
    if ("error" in manifestJson) {
      issues.push(manifestJson.error);
      continue;
    }

    const manifestResult = aircraftSchema.safeParse(manifestJson.data);
    if (!manifestResult.success) {
      issues.push(...issuesFrom(manifestFile, manifestResult.error));
      continue;
    }
    const manifest = manifestResult.data;

    if (folder !== manifest.code.toLowerCase()) {
      issues.push({
        file: relative(manifestFile),
        path: "code",
        message: `Folder is "${folder}" but the aircraft code is "${manifest.code}". Expected folder "${manifest.code.toLowerCase()}".`,
      });
    }

    const codeOwner = seenCodes.get(manifest.code);
    if (codeOwner) {
      issues.push({
        file: relative(manifestFile),
        path: "code",
        message: `Aircraft code "${manifest.code}" is already defined in ${codeOwner}`,
      });
      continue;
    }
    seenCodes.set(manifest.code, relative(manifestFile));

    const questions: Question[] = [];
    const sources = new Map<string, string>();
    const questionFiles = listJsonFiles(path.join(dir, "questions"));

    if (questionFiles.length === 0 && manifest.status === "active") {
      issues.push({
        file: relative(path.join(dir, "questions")),
        path: "(directory)",
        message: `Aircraft ${manifest.code} is "active" but has no question files`,
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

      const parsed = questionFileSchema.safeParse(json.data);
      if (!parsed.success) {
        issues.push(...issuesFrom(file, parsed.error));
        continue;
      }

      for (const question of parsed.data) {
        if (question.aircraft !== manifest.code) {
          issues.push({
            file: relative(file),
            path: `${question.id}.aircraft`,
            message: `Question is in the ${manifest.code} folder but declares aircraft "${question.aircraft}"`,
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

    aircraft.push({ manifest, questions, sources });
  }

  aircraft.sort(
    (a, b) =>
      a.manifest.sortOrder - b.manifest.sortOrder ||
      a.manifest.code.localeCompare(b.manifest.code),
  );

  return { aircraft, issues };
}

/** Loads content and throws a readable error if anything is wrong. */
export function loadContentOrThrow(contentDir: string = CONTENT_DIR): AircraftContent[] {
  const { aircraft, issues } = loadContent(contentDir);
  if (issues.length > 0) {
    const lines = issues.map((issue) => `  ${issue.file} → ${issue.path}: ${issue.message}`);
    throw new Error(`Content validation failed:\n${lines.join("\n")}`);
  }
  return aircraft;
}
