import type { Metadata } from "next";

import { Card, PageHeading } from "@/components/ui";
import { siteConfig } from "@/config/site";

import { AiSearchForm } from "./ai-search-form";

export const metadata: Metadata = {
  title: "AI Aviation Search",
  description: `Ask concise aviation study questions with the AI assistant on ${siteConfig.name}.`,
};

export default function AiSearchPage() {
  return (
    <>
      <PageHeading
        eyebrow="Tools"
        title="AI Aviation Search"
        subtitle="Ask an aviation question and get a concise AI-generated study response."
      />
      <div className="space-y-4">
        <AiSearchForm />
        <Card padding="p-4">
          <p className="text-sm text-muted-foreground">
            This assistant does not search or retrieve official FCOM, FCTM, or AFM documents. Treat its
            responses as general study guidance, not approved operational procedures; verify aircraft-specific
            information in your current manuals and with your instructor.
          </p>
        </Card>
      </div>
    </>
  );
}
