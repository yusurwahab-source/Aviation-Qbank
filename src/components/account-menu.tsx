import Link from "next/link";

import { logOut } from "@/app/(auth)/actions";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * The right-hand side of the header: who is signed in, or the way to sign in.
 *
 * Practice is deliberately open to everyone — an account is not required to
 * answer questions. It exists so that Phase 3 has somewhere to record answers.
 */
export async function AccountMenu() {
  let user = null;

  try {
    user = await getCurrentUser();
  } catch {
    // The header must never take the whole page down. If the database is
    // unreachable the page itself reports it; here we just show signed out.
    return null;
  }

  if (!user) {
    return (
      <nav className="flex items-center gap-3 text-sm">
        <Link href="/login" className="font-medium text-muted-foreground hover:text-brand">
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded-lg bg-brand px-3 py-1.5 font-semibold text-white transition hover:bg-brand-strong"
        >
          Sign up
        </Link>
      </nav>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span
        className="max-w-[12rem] truncate text-muted-foreground"
        title={user.email}
      >
        {user.email}
      </span>
      <form action={logOut}>
        <button
          type="submit"
          className="rounded-lg border border-border px-3 py-1.5 font-medium text-foreground transition hover:border-brand hover:text-brand"
        >
          Log out
        </button>
      </form>
    </div>
  );
}
