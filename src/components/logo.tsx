import { siteConfig } from "@/config/site";

/**
 * The product mark and the lockup that pairs it with the name.
 *
 * Everything here is drawn in `currentColor` and nothing sets a fill of its
 * own, so the mark takes the colour of whatever it is placed in and is
 * therefore correct in both themes, in the header, inside a button, and on a
 * solid accent fill — without a second asset or a `data-theme` check.
 *
 * The mark is a heading bug: the pointer a pilot sets on a compass rose to
 * mark the heading they mean to fly. The open bezel is the rose, the gap at
 * the top is north, and the delta breaking through it is the bug itself. It
 * is four straight lines and one arc, which is what keeps it legible at
 * 16px in a browser tab.
 *
 * The wordmark is set in the display face rather than drawn as paths. A
 * wordmark that is real text stays crisp at every size, can be selected and
 * read aloud, and cannot drift out of step with the type scale — the
 * typeface *is* the brand here, so freezing it into outlines would only
 * remove the ability to fix it later.
 */

export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      {/* The rose: an open bezel, north left clear for the bug. */}
      <path
        d="M8.54 5.35A13 13 0 1 0 23.46 5.35"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.38"
      />
      {/* The bug. */}
      <path d="M16 3.2 24 24 16 19.4 8 24Z" fill="currentColor" />
    </svg>
  );
}

export function Logo({
  className = "",
  markClassName = "h-7 w-7",
  showName = true,
}: {
  className?: string;
  markClassName?: string;
  /** False in tight spots — a mobile header, a button — where the mark alone carries it. */
  showName?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className={markClassName} />
      {showName ? (
        <span className="text-lg font-bold tracking-tight">{siteConfig.name}</span>
      ) : (
        <span className="sr-only">{siteConfig.name}</span>
      )}
    </span>
  );
}

/**
 * The PilotQBank wordmark: text only, outlined, one file per background.
 *
 * Two plain `<img>`s rather than one inline SVG, because the wordmark's
 * colours are part of the artwork (black or white lettering, a fixed amber Q)
 * and must not follow `currentColor`. Which one shows is decided by the same
 * `.icon-when-dark` / `.icon-when-light` rules the theme toggle uses, so it
 * cannot disagree with the theme and does not flash on hydration: the white
 * file sits on the dark palette, the black one on the light palette.
 */
export function LogoWordmark({ className = "h-6" }: { className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-wordmark-light.svg"
        alt="PilotQBank"
        width={180}
        height={30}
        className={`icon-when-dark w-auto max-w-none shrink-0 ${className}`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-wordmark.svg"
        alt="PilotQBank"
        width={180}
        height={30}
        className={`icon-when-light w-auto max-w-none shrink-0 ${className}`}
      />
    </>
  );
}
