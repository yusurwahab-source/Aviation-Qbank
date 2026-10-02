import { notFound } from "next/navigation";

import { getSiteSettings } from "@/db/settings";
import { getCurrentUser } from "@/lib/auth/session";
import { isOwner } from "@/lib/auth/owner";
import { envValue } from "@/lib/env";
import { isItemHidden } from "@/lib/settings";

export default async function ItemLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  if (isItemHidden(await getSiteSettings(), "class-rating", code)) {
    // The owner may preview an item that is still hidden from students.
    let owner = false;
    try {
      const email = (await getCurrentUser())?.email;
      owner = email ? isOwner(email, envValue("OWNER_EMAIL")) : false;
    } catch {
      owner = false;
    }
    if (!owner) notFound();
  }

  return children;
}
