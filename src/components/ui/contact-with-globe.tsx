"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

import { GlobeWireframe } from "@/components/ui/globe-wireframe";
import { cn } from "@/lib/utils";

/*
 * Adapted from ScrollX UI's "Contact with globe": colours are this app's
 * tokens, the globe is `ui/globe-wireframe.tsx`, and the form is a slot the
 * caller fills. Under reduced motion the sections fade without moving.
 */

const smoothEase = [0.25, 0.1, 0.25, 1] as const;

/** A dotted rule, faded at both ends. Decorative only. */
function DottedRule({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("h-4 w-full shrink-0 text-subtle-foreground", className)}
      style={{
        backgroundImage: "radial-gradient(circle, currentColor 0.8px, transparent 0.8px)",
        backgroundSize: "6px 100%",
        maskImage:
          "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
      }}
    />
  );
}

const ICON_PATHS = {
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  phone: (
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
  ),
  chat: <path d="M21 12a8.5 8.5 0 0 1-12.4 7.6L3 21l1.4-5.4A8.5 8.5 0 1 1 21 12Z" />,
  form: (
    <>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6M8 13h8M8 17h5" />
    </>
  ),
} as const;

export type ContactLinkIcon = keyof typeof ICON_PATHS;

export interface ContactLink {
  icon: ContactLinkIcon;
  label: string;
  href: string;
  /** Opens in a new tab, with no opener and no referrer. */
  external?: boolean;
}

interface ContactWithGlobeProps {
  title?: string;
  /** Small label above the title. */
  eyebrow?: string;
  description?: ReactNode;
  /** `h1` when this section is the page's own heading. */
  titleAs?: "h1" | "h2";
  asideTitle?: string;
  asideText?: ReactNode;
  links?: ContactLink[];
  formTitle?: string;
  formDescription?: ReactNode;
  /** The form itself. */
  children: ReactNode;
  className?: string;
}

export default function ContactWithGlobe({
  title = "Contact us",
  eyebrow = "Contact",
  description,
  titleAs: Title = "h2",
  asideTitle = "Get in touch",
  asideText,
  links = [],
  formTitle = "Send a message",
  formDescription,
  children,
  className,
}: ContactWithGlobeProps) {
  const reducedMotion = useReducedMotion();

  // Fade in on scroll; under reduced motion, fade without moving.
  const reveal = (delay: number, y = 14, x = 0) => ({
    initial: { opacity: 0, x: reducedMotion ? 0 : x, y: reducedMotion ? 0 : y },
    whileInView: { opacity: 1, x: 0, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.8, delay, ease: smoothEase },
  });

  return (
    <section data-globe-section className={cn("relative w-full", className)}>
      <div className="mb-10 flex flex-col items-center gap-3 text-center">
        <motion.p
          {...reveal(0, -12)}
          className="inline-flex items-center rounded-full border border-border bg-brand-soft px-4 py-1.5 text-sm font-medium text-brand-ink"
        >
          {eyebrow}
        </motion.p>

        <motion.div {...reveal(0.15)}>
          <Title className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {title}
          </Title>
        </motion.div>

        {description ? (
          <motion.div
            {...reveal(0.3)}
            className="max-w-xl text-base text-muted-foreground"
          >
            {description}
          </motion.div>
        ) : null}
      </div>

      <div className="mx-auto grid max-w-5xl grid-cols-1 items-start gap-10 lg:grid-cols-2">
        <motion.div {...reveal(0.2, 28)} className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-foreground">{asideTitle}</h2>
            {asideText ? (
              <div className="max-w-sm space-y-3 text-sm leading-relaxed text-muted-foreground">
                {asideText}
              </div>
            ) : null}
          </div>

          {links.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {links.map(({ icon, label, href, external }, i) => (
                <motion.li key={href} {...reveal(0.3 + i * 0.1, 0, -12)}>
                  <a
                    href={href}
                    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="tap-target group inline-flex items-center gap-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-muted transition-colors group-hover:border-brand-ink group-hover:bg-brand-soft">
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="size-3.5 text-subtle-foreground transition-colors group-hover:text-brand-ink"
                      >
                        {ICON_PATHS[icon]}
                      </svg>
                    </span>
                    {label}
                  </a>
                </motion.li>
              ))}
            </ul>
          ) : null}

          <div className="relative h-52 overflow-hidden">
            <GlobeWireframe className="absolute left-0 top-0 text-brand-ink" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-background to-transparent" />
          </div>
        </motion.div>

        <motion.div
          {...reveal(0.35, 28)}
          className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-5 shadow-sm sm:p-8"
        >
          <div>
            <h2 className="text-lg font-semibold text-foreground">{formTitle}</h2>
            {formDescription ? (
              <div className="mt-0.5 text-sm text-muted-foreground">{formDescription}</div>
            ) : null}
          </div>

          <DottedRule />

          {children}
        </motion.div>
      </div>
    </section>
  );
}
