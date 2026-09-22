import { notFound, redirect } from "next/navigation";

import { getClassRating } from "@/db/class-queries";
import { getAircraft } from "@/db/queries";

/**
 * `/aircraft/CODE/test` — the same legacy redirect as the aircraft page one
 * level up, carrying every query parameter across (`?mode=`, `?t=`,
 * `?topic=`, `?questions=`, `?from=`) so a resumed or bookmarked test link
 * still works after the move.
 */
export default async function LegacyAircraftTestRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ code }, query] = await Promise.all([params, searchParams]);
  const aircraftCode = code.toUpperCase();

  const [plane, ratingClass] = await Promise.all([
    getAircraft(aircraftCode),
    getClassRating(aircraftCode),
  ]);

  const target = plane
    ? `/type-rating/${plane.code}`
    : ratingClass
      ? `/class-rating/${ratingClass.code}`
      : null;

  if (!target) notFound();

  const forwarded = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    for (const v of Array.isArray(value) ? value : [value]) if (v) forwarded.append(key, v);
  }
  const queryString = forwarded.toString();

  redirect(`${target}/test${queryString ? `?${queryString}` : ""}`);
}
