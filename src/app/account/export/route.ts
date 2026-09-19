import "server-only";

import { exportAccountData } from "@/db/account-export";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Downloads everything stored about the signed-in account, as a file.
 *
 * A route handler rather than a server action: a server action can return
 * data to a client component, but turning that into a downloaded file
 * still means the browser building a `Blob` from it — a plain `GET` with a
 * `Content-Disposition` header is what actually makes a browser's normal
 * "Save As" happen with no client-side script involved at all.
 */
export async function GET(): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return new Response("Not signed in", { status: 401 });

  const data = await exportAccountData(user.id);

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="account-export.json"`,
    },
  });
}
