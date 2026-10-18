/**
 * Links the contact widget opens. Pure, so the number handling is asserted
 * rather than trusted: `wa.me` wants the international number as digits only,
 * with no `+`, spaces or leading zeros.
 */

export function whatsappHref(number: string, message?: string): string {
  const digits = number.replace(/\D/g, "");
  const base = `https://wa.me/${digits}`;
  const text = message?.trim();
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/** Pages where a floating button would sit on top of something that matters. */
export function contactWidgetHidden(pathname: string): boolean {
  return (
    pathname === "/contact" ||
    pathname.startsWith("/owner") ||
    pathname.startsWith("/pilot-sims/") ||
    /\/test(\/|$)/.test(pathname)
  );
}
