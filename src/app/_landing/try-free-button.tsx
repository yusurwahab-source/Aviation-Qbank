import Link from "next/link";

/**
 * The landing page's one primary action: start answering questions.
 *
 * The section pickers ask a stranger to decide something before they have
 * seen anything. This skips the decision — the link goes straight to a
 * short test. `href` is null when there is nowhere honest to send them (no
 * visible, active subject), and the button is then simply not drawn rather
 * than pointing at a page that 404s.
 */
export function TryFreeButton({
  href,
  className = "",
}: {
  href: string | null;
  className?: string;
}) {
  if (!href) return null;

  return (
    <Link
      href={href}
      className={`tap-target inline-flex w-full items-center justify-center rounded-lg bg-brand px-8 text-center text-base font-semibold text-on-solid transition hover:bg-brand-strong sm:w-auto ${className}`}
    >
      Try free questions
    </Link>
  );
}
