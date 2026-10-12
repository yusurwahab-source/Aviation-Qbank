import { notFound } from "next/navigation";

import {  } from "@/db/settings";
import { isSectionHidden } from "@/lib/settings";
import { getVisibleSiteSettings } from "@/lib/settings-visibility";

export default async function SectionLayout({ children }: { children: React.ReactNode }) {
  if (isSectionHidden(await getVisibleSiteSettings(), "flying-knowledge")) notFound();

  return children;
}
