import { redirect } from "next/navigation";

/** `/class/CODE/test` → `/class-rating/CODE/test`, carrying every query
 * parameter across so a resumed or bookmarked test link still works. */
export default async function LegacyClassTestRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ code }, query] = await Promise.all([params, searchParams]);

  const forwarded = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    for (const v of Array.isArray(value) ? value : [value]) if (v) forwarded.append(key, v);
  }
  const queryString = forwarded.toString();

  redirect(`/class-rating/${code.toUpperCase()}/test${queryString ? `?${queryString}` : ""}`);
}
