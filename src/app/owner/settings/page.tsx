import type { Metadata } from "next";

import { Card, PageHeading } from "@/components/ui";
import { listClassRatings } from "@/db/class-queries";
import { listFlyingKnowledgeSubjects } from "@/db/flying-knowledge-queries";
import { listAircraft } from "@/db/queries";
import { getSiteSettings } from "@/db/settings";
import { requireOwner } from "@/lib/auth/require-owner";

import {
  OwnerNav,
  OwnerPageError,
  describeError,
  isNextControlFlowError,
} from "../owner-ui";
import { SettingsForm, type HideableItem } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

/**
 * What can change without a deploy, and only this.
 *
 * Deliberately short: content is `/content`'s job and prices are Stripe's,
 * both said plainly in `src/lib/settings.ts`. What lives here is what no
 * file describes — the free allowance, and a line of text for everyone.
 */
export default async function OwnerSettingsPage() {
  // getSiteSettings() already falls back to defaults on its own failure —
  // the one thing left exposed here is requireOwner() itself, if
  // getCurrentUser() cannot reach the database.
  try {
    await requireOwner();
  } catch (error) {
    if (isNextControlFlowError(error)) throw error;
    console.error("Failed to verify the owner for /owner/settings:", error);
    return (
      <>
        <PageHeading title="Settings" />
        <OwnerNav current="/owner/settings" />
        <OwnerPageError detail={describeError(error)} />
      </>
    );
  }
  const settings = await getSiteSettings();

  let items: HideableItem[] = [];
  try {
    const [fleet, classes, subjects] = await Promise.all([
      listAircraft(),
      listClassRatings(),
      listFlyingKnowledgeSubjects(),
    ]);
    items = [
      ...fleet.map((row) => ({
        section: "type-rating" as const,
        code: row.code,
        name: row.name,
        description: row.description,
      })),
      ...classes.map((row) => ({
        section: "class-rating" as const,
        code: row.code,
        name: row.name,
        description: row.description,
      })),
      ...subjects.map((row) => ({
        section: "flying-knowledge" as const,
        code: row.code,
        name: row.name,
        description: row.description,
      })),
    ];
  } catch {
    items = [];
  }

  return (
    <>
      <PageHeading
        title="Settings"
        subtitle="Changes here apply immediately, with no deploy."
      />
      <OwnerNav current="/owner/settings" />

      <Card>
        <SettingsForm settings={settings} items={items} />
      </Card>

      <Card className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          What is not here
        </h2>
        <p className="text-xs text-muted-foreground">
          Question content lives in the repository under{" "}
          <code className="font-mono">/content</code> and is rewritten from
          those files on every deploy — a setting stored here could never win
          against that. Subscription prices are set in Stripe, not here, so a
          price change is never a deploy. The product&rsquo;s name and branding
          live in <code className="font-mono">src/config/site.ts</code>.
        </p>
      </Card>
    </>
  );
}
