import { PageHeading } from "@/components/ui";
import { SkeletonCardGrid, SkeletonRows } from "@/components/skeleton";

export default function Loading() {
  return (
    <>
      <PageHeading title="Your progress" />
      <SkeletonCardGrid count={4} />
      <div className="mt-6">
        <SkeletonRows rows={5} />
      </div>
    </>
  );
}
