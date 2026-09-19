import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { Badge, Card, EmptyState, PageHeading } from "@/components/ui";
import { searchQuestions, type SearchResult } from "@/db/search";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Search" };
export const dynamic = "force-dynamic";

/**
 * Keyword search across every published question — signed-in only, the same
 * gate `/progress` and the test builder's history-based presets already
 * sit behind, since what search exists *for* here is jumping straight into
 * a question to study, and the study view it links to needs an account too.
 *
 * A plain GET form, the same pattern `/owner/accounts` uses for its own
 * search: the query lives in the URL, so a result is linkable and a
 * refresh does not lose it.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const query = await searchParams;
  const q = Array.isArray(query.q) ? (query.q[0] ?? "") : (query.q ?? "");
  const trimmed = q.trim();

  let results: SearchResult[] = [];
  try {
    if (trimmed) results = await searchQuestions(trimmed);
  } catch (error) {
    return (
      <>
        <PageHeading title="Search" />
        <DatabaseUnavailable detail={(error as Error).message} />
      </>
    );
  }

  return (
    <>
      <PageHeading
        title="Search"
        subtitle="Find a question by keyword, across every aircraft's question text, options and explanation."
      />

      <Card className="mb-6">
        <form action="/search" method="get" className="flex flex-wrap gap-2">
          <label htmlFor="q" className="sr-only">
            Search questions
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="e.g. fuel pump, VMC, transponder"
            autoFocus
            className="min-h-11 flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none"
          />
          <button
            type="submit"
            className="min-h-11 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-on-solid transition hover:bg-brand-strong"
          >
            Search
          </button>
        </form>
      </Card>

      {!trimmed ? (
        <EmptyState title="Search across every question">
          Try a term from a system you are studying — a component, a limitation, a procedure.
        </EmptyState>
      ) : results.length === 0 ? (
        <EmptyState title={`No questions match “${trimmed}”.`}>
          Try a shorter or more general term.
        </EmptyState>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {results.length} {results.length === 1 ? "question" : "questions"} matching “{trimmed}”.
          </p>
          <ul className="space-y-2">
            {results.map((result) => (
              <li key={result.id}>
                <Link href={`/aircraft/${result.aircraftCode}/question/${result.id}`} className="block">
                  <Card className="transition hover:border-brand">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="brand">{result.aircraftCode}</Badge>
                      <Badge>{result.topic}</Badge>
                    </div>
                    <p className="question-text mt-2 text-foreground">{result.question}</p>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
