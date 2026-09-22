import { notFound, redirect } from "next/navigation";

import { getClassRating } from "@/db/class-queries";
import { getAircraft } from "@/db/queries";

/**
 * `/aircraft/CODE` used to be every aircraft's page, type rating or class
 * rating alike. Now that the two live under `/type-rating` and
 * `/class-rating` (`CLAUDE.md`), an old link has to be told which — the DA40
 * moved trees entirely, so the code alone no longer says where it lives.
 * A database lookup against both is the honest way to answer that rather
 * than guessing.
 */
export default async function LegacyAircraftRedirect({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const aircraftCode = code.toUpperCase();

  const [plane, ratingClass] = await Promise.all([
    getAircraft(aircraftCode),
    getClassRating(aircraftCode),
  ]);

  if (plane) redirect(`/type-rating/${plane.code}`);
  if (ratingClass) redirect(`/class-rating/${ratingClass.code}`);
  notFound();
}
