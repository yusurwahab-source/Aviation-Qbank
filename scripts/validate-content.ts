/**
 * Validates every file in /content against the question schema.
 *
 * Runs before `next build` and before `db:seed`, so a malformed question file
 * breaks the build loudly instead of failing silently at runtime.
 *
 *   npm run validate:content
 */
import { loadContent, type ContentIssue } from "../src/content/load";
import { loadClassContent } from "../src/content/load-classes";

const ESC = String.fromCharCode(27);
const RED = `${ESC}[31m`;
const GREEN = `${ESC}[32m`;
const DIM = `${ESC}[2m`;
const BOLD = `${ESC}[1m`;
const RESET = `${ESC}[0m`;

function main(): void {
  const { aircraft, issues } = loadContent();
  const { classes, issues: classIssues } = loadClassContent();
  const allIssues = [...issues, ...classIssues];

  if (allIssues.length > 0) {
    const plural = allIssues.length === 1 ? "" : "s";
    console.error(
      `\n${RED}${BOLD}x Content validation failed - ${allIssues.length} problem${plural}${RESET}\n`,
    );

    const byFile = new Map<string, ContentIssue[]>();
    for (const issue of allIssues) {
      const list = byFile.get(issue.file) ?? [];
      list.push(issue);
      byFile.set(issue.file, list);
    }

    for (const [file, fileIssues] of byFile) {
      console.error(`${BOLD}${file}${RESET}`);
      for (const issue of fileIssues) {
        console.error(`  ${RED}-${RESET} ${DIM}${issue.path}${RESET}  ${issue.message}`);
      }
      console.error("");
    }

    console.error(`${DIM}Fix the files above, then run this again.${RESET}\n`);
    process.exit(1);
  }

  const totals = aircraft.map((entry) => {
    const published = entry.questions.filter((q) => q.status === "published").length;
    return { entry, published, draft: entry.questions.length - published };
  });

  const questionCount = totals.reduce((sum, t) => sum + t.entry.questions.length, 0);

  console.log(
    `\n${GREEN}${BOLD}Content is valid${RESET} - ${aircraft.length} aircraft, ${questionCount} question${questionCount === 1 ? "" : "s"}\n`,
  );

  for (const { entry, published, draft } of totals) {
    const topics = new Set(entry.questions.map((q) => q.topic));
    console.log(
      `  ${BOLD}${entry.manifest.code}${RESET} ${entry.manifest.name} ${DIM}- ${published} published, ${draft} draft, ${topics.size} topic${topics.size === 1 ? "" : "s"}${RESET}`,
    );
  }

  if (classes.length > 0) {
    const classQuestionCount = classes.reduce((sum, c) => sum + c.questions.length, 0);
    console.log(
      `\n${GREEN}${BOLD}Class ratings${RESET} - ${classes.length} class, ${classQuestionCount} question${classQuestionCount === 1 ? "" : "s"}\n`,
    );
    for (const entry of classes) {
      const published = entry.questions.filter((q) => q.status === "published").length;
      const draft = entry.questions.length - published;
      const topics = new Set(entry.questions.map((q) => q.topic));
      console.log(
        `  ${BOLD}${entry.manifest.code}${RESET} ${entry.manifest.name} ${DIM}- ${published} published, ${draft} draft, ${topics.size} topic${topics.size === 1 ? "" : "s"}${RESET}`,
      );
    }
  }
  console.log("");
}

main();
