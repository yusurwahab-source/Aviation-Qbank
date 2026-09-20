import "server-only";

import { listGiftCodesWithCounts } from "@/db/gift-codes";
import { requireOwner } from "@/lib/auth/require-owner";

/**
 * Every gift code as a CSV download, for pasting into a spreadsheet or
 * handing a batch to whoever is emailing them out.
 *
 * `requireOwner()` here does the same job it does on every other action in
 * this area: a route handler is its own reachable entry point too, not
 * covered by the page around it having already checked. `notFound()` (what
 * `requireOwner` throws) renders as Next's 404 page here exactly as it does
 * for a page component.
 */
export async function GET(): Promise<Response> {
  await requireOwner();

  const codes = await listGiftCodesWithCounts();

  const headers = [
    "code",
    "plan",
    "duration_days",
    "max_redemptions",
    "redemption_count",
    "unlocks_aircraft_code",
    "expires_at",
    "disabled_at",
    "note",
    "created_at",
  ];

  const rows = codes.map((code) =>
    [
      code.code,
      code.plan,
      code.durationDays,
      code.maxRedemptions,
      code.redemptionCount,
      code.unlocksAircraftCode ?? "",
      code.expiresAt?.toISOString() ?? "",
      code.disabledAt?.toISOString() ?? "",
      code.note ?? "",
      code.createdAt.toISOString(),
    ]
      .map(csvField)
      .join(","),
  );

  const csv = [headers.join(","), ...rows].join("\r\n") + "\r\n";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gift-codes-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

/** Quotes a field only when it needs it, and escapes an embedded quote by
 * doubling it — the one rule CSV actually has. */
function csvField(value: string | number): string {
  const text = String(value);
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}
