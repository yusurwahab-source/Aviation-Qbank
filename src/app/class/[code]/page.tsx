import { redirect } from "next/navigation";

/** `/class/CODE` → `/class-rating/CODE`, kept for any link minted before the
 * rename. A class rating's code never moves trees, unlike an aircraft's, so
 * this needs no lookup — just the new prefix. */
export default async function LegacyClassRedirect({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  redirect(`/class-rating/${code.toUpperCase()}`);
}
