import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { AccountMenu } from "@/components/account-menu";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Aviation Question Bank",
    template: "%s | Aviation Question Bank",
  },
  description: "Type rating practice questions for student pilots.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col">
        <header className="border-b border-border bg-surface">
          <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-5 py-4">
            <Link
              href="/"
              className="text-base font-semibold tracking-tight text-foreground hover:text-brand"
            >
              Aviation Question Bank
            </Link>
            <AccountMenu />
          </div>
        </header>

        <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8">{children}</main>

        <footer className="border-t border-border bg-surface">
          <div className="mx-auto w-full max-w-4xl px-5 py-4 text-xs text-muted-foreground">
            Practice results are not saved yet. Recording every answer comes next.
          </div>
        </footer>
      </body>
    </html>
  );
}
