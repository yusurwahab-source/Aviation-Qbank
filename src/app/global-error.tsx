"use client";

import { useEffect } from "react";

import { siteConfig } from "@/config/site";

/**
 * Catches an error thrown by the root layout itself — the one case
 * `error.tsx` cannot cover, because that boundary lives *inside* the
 * layout and disappears along with it. Next requires this file to render
 * its own `<html>`/`<body>`, so it cannot lean on `globals.css`'s tokens or
 * the shared `Card`/`PageHeading` components the way `error.tsx` does —
 * both of those risk being part of what just broke. Inline styles only,
 * matching the dark theme's own colours by value rather than by import.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#080c14",
          color: "#e8eef7",
          fontFamily:
            "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
        }}
      >
        <div style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Something went wrong</h1>
          <p style={{ marginTop: 12, color: "#96a5bc", fontSize: 14, lineHeight: 1.6 }}>
            {siteConfig.name} hit a problem it could not recover from. It has been logged.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 20,
              minHeight: 44,
              padding: "0 20px",
              borderRadius: 8,
              border: "none",
              backgroundColor: "#3ab7cc",
              color: "#05121a",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
