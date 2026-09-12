import { Card } from "@/components/ui";

/**
 * Shown instead of a stack trace when the database cannot be reached.
 *
 * The project owner is a pilot, not a systems administrator: if the app cannot
 * talk to Postgres it should say so in plain words and give the two commands
 * that fix it.
 */
export function DatabaseUnavailable({ detail }: { detail?: string }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold text-foreground">The question bank is not available</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        The site could not reach its database. If you are running this on your own machine, check
        that <code className="rounded bg-surface-muted px-1 py-0.5 font-mono text-xs">DATABASE_URL</code>{" "}
        is set in <code className="rounded bg-surface-muted px-1 py-0.5 font-mono text-xs">.env.local</code>,
        then set the database up:
      </p>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-surface-muted p-3 font-mono text-xs text-foreground">
        npm run db:migrate{"\n"}npm run db:seed
      </pre>
      {detail ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Technical detail: <span className="font-mono">{detail}</span>
        </p>
      ) : null}
    </Card>
  );
}
