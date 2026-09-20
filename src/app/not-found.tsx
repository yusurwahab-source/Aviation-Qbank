import Link from "next/link";

import { Card, PageHeading } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <>
      <PageHeading title="Page not found" />
      <Card>
        <p className="text-sm text-muted-foreground">
          That aircraft or page does not exist in the question bank.
        </p>
        <p className="mt-4">
          <Link
            href="/aircraft"
            className="link-standalone text-sm font-medium text-brand hover:underline"
          >
            ← Choose an aircraft
          </Link>
        </p>
      </Card>
    </>
  );
}
