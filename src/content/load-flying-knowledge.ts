import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

import {
  flyingKnowledgeQuestionFileSchema,
  flyingKnowledgeSubjectSchema,
  type FlyingKnowledgeQuestion,
  type FlyingKnowledgeSubjectManifest,
} from "./flying-knowledge-schema";

/**
 * Loads and validates every question file under `content/flying-knowledge/`.
 *
 * A near-mirror of `load-classes.ts`: `content/flying-knowledge/<code>/subject.json`
 * holds one manifest plus a `questions/` folder of JSON files, exactly as a
 * class rating's `content/classes/<code>/class.json` does. Kept as its own
 * module rather than folded into `loadContent` or `loadClassContent` because
 * all three content trees stay genuinely separate all the way down — see the
 * note on `flyingKnowledgeSubjects` in `db/schema.ts`.
 */

export const FLYING_KNOWLEDGE_CONTENT_DIR = path.join(
  process.cwd(),
  "content",
  "flying-knowledge",
);

export type ContentIssue = { file: string; path: string; message: string };

export type FlyingKnowledgeContent = {
  manifest: FlyingKnowledgeSubjectManifest;
  questions: FlyingKnowledgeQuestion[];
  sources: Map<string, string>;
};

export type FlyingKnowledgeContentLoadResult = {
  subjects: FlyingKnowledgeContent[];
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
 * Reads every subject folder under `content/flying-knowledge/`. Never throws
 * for bad content: problems come back in `issues`, the same contract
 * `loadContent` and `loadClassContent` keep. An entirely missing
 * `content/flying-knowledge/` directory is not itself an error — this
 * section shipped with no bank at all for a long time, and a repository with
 * no subjects yet still loads cleanly with zero subjects rather than failing
 * the build.
 */
export function loadFlyingKnowledgeContent(
  contentDir: string = FLYING_KNOWLEDGE_CONTENT_DIR,
): FlyingKnowledgeContentLoadResult {
  const issues: ContentIssue[] = [];
  const subjects: FlyingKnowledgeContent[] = [];
  const seenIds = new Map<string, string>();
  const seenCodes = new Map<string, string>();

  let folders: string[];
  try {
    folders = listDirs(contentDir);
  } catch {
    return { subjects, issues };
  }

  for (const folder of folders) {
    const dir = path.join(contentDir, folder);
    const manifestFile = path.join(dir, "subject.json");

    const manifestJson = readJson(manifestFile);
    if ("error" in manifestJson) {
      issues.push(manifestJson.error);
      continue;
    }

    const manifestResult = flyingKnowledgeSubjectSchema.safeParse(manifestJson.data);
    if (!manifestResult.success) {
      issues.push(...issuesFrom(manifestFile, manifestResult.error));
      continue;
    }
    const manifest = manifestResult.data;

    if (folder !== manifest.code.toLowerCase()) {
      issues.push({
        file: relative(manifestFile),
        path: "code",
        message: `Folder is "${folder}" but the subject code is "${manifest.code}". Expected folder "${manifest.code.toLowerCase()}".`,
      });
    }

    const codeOwner = seenCodes.get(manifest.code);
    if (codeOwner) {
      issues.push({
        file: relative(manifestFile),
        path: "code",
        message: `Subject code "${manifest.code}" is already defined in ${codeOwner}`,
      });
      continue;
    }
    seenCodes.set(manifest.code, relative(manifestFile));

    const questions: FlyingKnowledgeQuestion[] = [];
    const sources = new Map<string, string>();
    const questionFiles = listJsonFiles(path.join(dir, "questions"));

    if (questionFiles.length === 0 && manifest.status === "active") {
      issues.push({
        file: relative(path.join(dir, "questions")),
        path: "(directory)",
        message: `Subject ${manifest.code} is "active" but has no question files`,
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

      const parsed = flyingKnowledgeQuestionFileSchema.safeParse(json.data);
      if (!parsed.success) {
        issues.push(...issuesFrom(file, parsed.error));
        continue;
      }

      for (const question of parsed.data) {
        if (question.subjectCode !== manifest.code) {
          issues.push({
            file: relative(file),
            path: `${question.id}.subjectCode`,
            message: `Question is in the ${manifest.code} folder but declares subjectCode "${question.subjectCode}"`,
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

    subjects.push({ manifest, questions, sources });
  }

  subjects.sort(
    (a, b) =>
      a.manifest.sortOrder - b.manifest.sortOrder || a.manifest.code.localeCompare(b.manifest.code),
  );

  return { subjects, issues };
}

/** Loads Flying Knowledge content and throws a readable error if anything is
 * wrong. */
export function loadFlyingKnowledgeContentOrThrow(
  contentDir: string = FLYING_KNOWLEDGE_CONTENT_DIR,
): FlyingKnowledgeContent[] {
  const { subjects, issues } = loadFlyingKnowledgeContent(contentDir);
  if (issues.length > 0) {
    const lines = issues.map((issue) => `  ${issue.file} → ${issue.path}: ${issue.message}`);
    throw new Error(`Flying Knowledge content validation failed:\n${lines.join("\n")}`);
  }
  return subjects;
}
