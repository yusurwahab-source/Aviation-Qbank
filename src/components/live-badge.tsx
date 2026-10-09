/** "Live" with a pulsing dot — a bank a student can sit today. The pulse
 * stops for visitors who ask their device for less motion. */
export function LiveBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-correct-soft px-2.5 py-1 text-xs font-medium text-correct">
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full rounded-full bg-correct opacity-75 motion-safe:animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-correct" />
      </span>
      Live
    </span>
  );
}
