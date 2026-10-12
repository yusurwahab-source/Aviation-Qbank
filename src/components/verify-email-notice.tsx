"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * A single line under the header for a signed-in student whose email is not
 * yet confirmed. The server decides whether to render it at all
 * (`VerifyEmailBanner`); this only steps aside on the pages where it would be
 * redundant or unwelcome: the home page, the account page and the verify page.
 */
export function VerifyEmailNotice() {
  const pathname = usePathname();
  if (pathname === "/" || pathname === "/account" || pathname.startsWith("/verify-email")) return null;

  return (
    <div className="border-b border-border bg-brand-soft">
      <p className="mx-auto w-full max-w-5xl px-4 py-2 text-center text-sm text-brand-ink sm:px-5">
        Confirm your email address to subscribe and get messages from us.{" "}
        <Link href="/account" className="font-semibold underline">
          Confirm now
        </Link>
      </p>
    </div>
  );
}
