import { TryFreeButton } from "./try-free-button";

/**
 * A slim, low-key invitation to just look — one line, one button, no
 * account, no "3 free questions" countdown language, because the point is
 * to lower the bar to zero rather than to frame it as a limited allowance.
 * The stronger, two-button conversion push lives separately in `FinalCta`
 * at the bottom of the page; this one is a quiet middle-of-the-page nudge
 * for someone who is reading rather than ready to decide.
 *
 * Renders nothing when there is nowhere honest to send a visitor — see
 * `TryFreeButton`.
 */
export function TryStrip({ tryHref }: { tryHref: string | null }) {
  if (!tryHref) return null;

  return (
    <section className="border-y border-border py-6">
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <p className="text-sm font-medium text-foreground sm:text-base">
          Take a look — no account needed.
        </p>
        <TryFreeButton href={tryHref} className="sm:w-auto" />
      </div>
    </section>
  );
}
