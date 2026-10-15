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
        subtitle="Ask an aviation question and get a concise answer grounded in PilotQBank's local content."
      />
      <div className="space-y-4">
        <AiSearchForm />
        <Card padding="p-4">
          <p className="text-sm text-muted-foreground">
            Answers are limited to matching local question-bank and documentation content; this is not a
            complete or approved FCOM, FCTM, or AFM database. Verify aircraft-specific information in your
            current approved manuals and with your instructor.
          </p>
        </Card>
      </div>
    </>
  );
}
