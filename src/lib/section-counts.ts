export type SectionCounts = { aircraftCount: number; questionCount: number };

/** Rows in a content tree and the published questions across them. */
export function summariseSection(rows: { publishedQuestions: number }[]): SectionCounts {
  return {
    aircraftCount: rows.length,
    questionCount: rows.reduce((sum, row) => sum + row.publishedQuestions, 0),
  };
}
