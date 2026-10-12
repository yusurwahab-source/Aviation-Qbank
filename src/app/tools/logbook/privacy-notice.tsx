/** The short privacy notice shown wherever photos are taken. Students are
 * in Europe; this is the GDPR notice in a sentence or four, with the full
 * policy one link away. */
export function LogbookPrivacyNotice() {
  return (
    <div className="rounded-lg border border-border bg-surface-muted p-4 text-xs leading-relaxed text-muted-foreground">
      <p className="font-semibold text-foreground">Your photos and your data</p>
      <ul className="mt-2 list-disc space-y-1 pl-4">
        <li>
          Photos are processed in memory and sent to our AI provider (Anthropic) only to read the page. We
          never store them.
        </li>
        <li>
          The entries read from them stay in your browser unless you press <strong>Save to my account</strong>.
          You can delete everything at any time.
        </li>
        <li>
          We keep a count of how many spreads you have scanned — no content — so the per-logbook limit works.
        </li>
      </ul>
      <p className="mt-2">
        Details in the{" "}
        <a href="/privacy" className="font-medium text-brand-ink hover:underline">
          privacy policy
        </a>
        .
      </p>
    </div>
  );
}
