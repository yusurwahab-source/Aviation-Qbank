import { PageHeading } from "@/components/ui";
import { SkeletonCardGrid } from "@/components/skeleton";

export default function Loading() {
  return (
    <>
      <PageHeading
        title="Choose an aircraft"
        subtitle="Pick a type to start a practice test. Each aircraft has its own question bank."
      />
      <SkeletonCardGrid count={4} />
    </>
  );
}
