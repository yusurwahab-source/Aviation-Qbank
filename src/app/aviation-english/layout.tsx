import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: { default: "Aviation English (ICAO ELP)", template: "%s · Aviation English" },
  description: "ICAO English Language Proficiency practice: lessons, drills, a mock exam and a six-criteria score report.",
};

const LINKS = [
  { href: "/aviation-english", label: "Dashboard" },
  { href: "/aviation-english/course", label: "Course" },
  { href: "/aviation-english/practice", label: "Practice" },
  { href: "/aviation-english/exam", label: "Mock exam" },
];

/** Section-local sub-navigation only; the global shell is untouched. */
export default function AviationEnglishLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <nav aria-label="Aviation English" className="mb-6 flex flex-wrap gap-2 border-b border-border pb-3">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="tap-target inline-flex items-center rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-surface-muted hover:text-foreground"
          >
            {l.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
