/**
 * Mints free-access gift codes and prints them.
 *
 *   npm run gift:generate -- --count 5 --days 30 --plan monthly --note "beta testers"
 *
 * There is no admin panel for this — it is a script run by hand, the same
 * reasoning as `db:seed`: minting a code is rare, done by the owner, and
 * does not need a page in the product to justify existing. Send a printed
 * code to whoever it is for; they redeem it at /redeem.
 */
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

import { createGiftCodes } from "../src/db/gift-codes";
import { getPool } from "../src/db";

function readArg(name: string): string | undefined {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

function usageError(message: string): never {
  console.error(message);
  console.error(
    "Usage: npm run gift:generate -- --count <n> --days <n> --plan <monthly|quarterly> [--note \"...\"]",
  );
  process.exit(1);
}

async function main(): Promise<void> {
  const count = Number(readArg("count") ?? "1");
  const days = Number(readArg("days") ?? "");
  const planArg = readArg("plan");
  const note = readArg("note") ?? null;

  if (!Number.isInteger(count) || count < 1) usageError("--count must be a positive whole number.");
  if (!Number.isInteger(days) || days < 1) usageError("--days must be a positive whole number.");
  if (planArg !== "monthly" && planArg !== "quarterly") {
    usageError('--plan must be "monthly" or "quarterly".');
  }

  try {
    const codes = await createGiftCodes({ count, plan: planArg, durationDays: days, note });
    console.log(`Minted ${codes.length} code${codes.length === 1 ? "" : "s"}, ${days} days of ${planArg} access each:`);
    console.log("");
    for (const code of codes) console.log(`  ${code}`);
    console.log("");
    console.log("Redeemed at /redeem, once signed in. Each code works exactly once.");
  } finally {
    await getPool().end();
  }
}

main().catch((error: unknown) => {
  console.error("Could not generate gift codes:");
  console.error(error);
  process.exit(1);
});
