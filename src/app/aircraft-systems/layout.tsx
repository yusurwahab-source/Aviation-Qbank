import { notFound } from "next/navigation";

import {  } from "@/db/settings";
import { isPillarHidden } from "@/lib/pillars";
import { getVisibleSiteSettings } from "@/lib/settings-visibility";

export default async function AircraftSystemsLayout({ children }: { children: React.ReactNode }) {
  if (isPillarHidden(await getVisibleSiteSettings(), "aircraft-systems")) notFound();

  return children;
}
