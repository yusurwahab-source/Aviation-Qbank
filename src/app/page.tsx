import Link from "next/link";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { Badge, Card, EmptyState, PageHeading } from "@/components/ui";
import { listAircraft, type AircraftSummary } from "@/db/queries";

// The aircraft list comes from the database, so this page is rendered per request.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  let fleet: AircraftSummary[];

  try {
    fleet = await listAircraft();
  } catch (error) {
    return (
      <>
        <PageHeading title="Choose an aircraft" />
        <DatabaseUnavailable detail={(error as Error).message} />
      </>
    );
  }

  return (
    <>
      <PageHeading
        title="Choose an aircraft"
        subtitle="Pick a type to start a practice test. Each aircraft has its own question bank."
      />

      {fleet.length === 0 ? (
        <EmptyState title="No aircraft loaded yet">
          Add a folder under <code className="font-mono">/content</code> and run{" "}
          <code className="font-mono">npm run db:seed</code>.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {fleet.map((plane) => (
            <li key={plane.code}>
              <AircraftCard plane={plane} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function AircraftCard({ plane }: { plane: AircraftSummary }) {
  const ready = plane.status === "active" && plane.publishedQuestions > 0;

  const body = (
    <Card
      className={`h-full transition ${
        ready ? "hover:border-brand hover:shadow-sm" : "opacity-70"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-brand">
            {plane.code}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">{plane.name}</h2>
          <p className="text-sm text-muted-foreground">
            {plane.manufacturer}
            {plane.variant ? ` · ${plane.variant}` : ""}
          </p>
        </div>
        {ready ? (
          <Badge tone="brand">{plane.publishedQuestions} questions</Badge>
        ) : (
          <Badge>Coming soon</Badge>
        )}
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{plane.description}</p>
    </Card>
  );

  if (!ready) return body;

  return (
    <Link href={`/aircraft/${plane.code}`} className="block h-full">
      {body}
    </Link>
  );
}
