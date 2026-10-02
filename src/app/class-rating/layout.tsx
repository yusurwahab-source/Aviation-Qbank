import { notFound } from "next/navigation";

import { getSiteSettings } from "@/db/settings";
import { isSectionHidden } from "@/lib/settings";

export default async function SectionLayout({ children }: { children: React.ReactNode }) {
  if (isSectionHidden(await getSiteSettings(), "class-rating")) notFound();

  return children;
}
