import { Card, PageHeading } from "@/components/ui";
import { SkeletonPanel } from "@/components/skeleton";

export default function Loading() {
  return (
    <>
      <PageHeading title="Loading…" />
      <Card>
        <div aria-hidden="true" className="h-4 w-2/3 animate-pulse rounded-md bg-surface-muted" />
      </Card>
      <section className="mt-6">
        <SkeletonPanel lines={6} />
      </section>
    </>
  );
}
