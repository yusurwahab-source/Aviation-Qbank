/**
 * The theoretical-knowledge subjects of the EASA ATPL, in syllabus order.
 *
 * A static list on purpose: a subject with no questions yet has no content
 * folder and no database row (`db:seed` would delete one), so "coming soon"
 * rows cannot come from the database. A row is live only when a Flying
 * Knowledge subject names its `code` here and has published questions.
 */
export type AtplSubject = {
  /** EASA syllabus number, e.g. "080". */
  number: string;
  name: string;
  /** The Flying Knowledge subject code holding this subject's questions. */
  code?: string;
};

export const ATPL_SUBJECTS: readonly AtplSubject[] = [
  { number: "010", name: "Air Law", code: "LAW" },
  { number: "021", name: "Airframe, Systems, Electrics, Powerplant & Emergency Equipment", code: "AGK" },
  { number: "022", name: "Instrumentation", code: "INST" },
  { number: "031", name: "Mass & Balance", code: "MB" },
  { number: "032", name: "Performance", code: "PERF" },
  { number: "033", name: "Flight Planning & Monitoring" },
  { number: "040", name: "Human Performance & Limitations", code: "HPL" },
  { number: "050", name: "Meteorology", code: "MET" },
  { number: "061", name: "General Navigation" },
  { number: "062", name: "Radio Navigation", code: "RNAV" },
  { number: "070", name: "Operational Procedures", code: "OPS" },
  { number: "080", name: "Principles of Flight", code: "POF" },
  { number: "090", name: "Communications", code: "COM" },
];

export type AtplRow = {
  number: string;
  name: string;
  live: { code: string; publishedQuestions: number } | null;
};

type SubjectFact = {
  code: string;
  status: "active" | "coming_soon";
  publishedQuestions: number;
};

/** One row per ATPL subject; `live` is set only for a subject that can be sat. */
export function buildAtplRows(subjects: readonly SubjectFact[]): AtplRow[] {
  const byCode = new Map(subjects.map((subject) => [subject.code, subject]));
  return ATPL_SUBJECTS.map((entry) => {
    const found = entry.code ? byCode.get(entry.code) : undefined;
    const ready = found && found.status === "active" && found.publishedQuestions > 0;
    return {
      number: entry.number,
      name: entry.name,
      live: ready ? { code: found.code, publishedQuestions: found.publishedQuestions } : null,
    };
  });
}
