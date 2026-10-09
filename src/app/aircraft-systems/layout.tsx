import { notFound } from "next/navigation";

import { getSiteSettings } from "@/db/settings";
import { isPillarHidden } from "@/lib/pillars";

export default async function AircraftSystemsLayout({ children }: { children: React.ReactNode }) {
  if (isPillarHidden(await getSiteSettings(), "aircraft-systems")) notFound();

  return children;
}
