import type { Metadata } from "next";

import { Card, PageHeading } from "@/components/ui";
import { getSiteSettings } from "@/db/settings";
import { requireOwner } from "@/lib/auth/require-owner";

import { OwnerNav } from "../owner-ui";
import { SettingsForm } from "./settings-form";

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
  await requireOwner();
  const settings = await getSiteSettings();

  return (
    <>
      <PageHeading
        title="Settings"
        subtitle="Changes here apply immediately, with no deploy."
      />
      <OwnerNav current="/owner/settings" />

      <Card>
        <SettingsForm settings={settings} />
      </Card>

      <Card className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-foreground">What is not here</h2>
        <p className="text-xs text-muted-foreground">
          Question content lives in the repository under <code className="font-mono">/content</code>{" "}
          and is rewritten from those files on every deploy — a setting stored here could never win
          against that. Subscription prices are set in Stripe, not here, so a price change is
          never a deploy. The product&rsquo;s name and branding live in{" "}
          <code className="font-mono">src/config/site.ts</code>.
        </p>
      </Card>
    </>
  );
}
