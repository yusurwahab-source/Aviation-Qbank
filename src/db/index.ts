import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

/**
 * The database connection.
 *
 * One pool per process, cached on `globalThis` so Next.js hot reloading in
 * development does not open a new pool on every edit.
 */

export class MissingDatabaseUrlError extends Error {
  constructor() {
    super(
      "DATABASE_URL is not set. Copy .env.example to .env.local and point it at your Postgres database.",
    );
    this.name = "MissingDatabaseUrlError";
  }
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new MissingDatabaseUrlError();

  return new Pool({
    connectionString,
    // Hosted Postgres (Neon, Supabase) terminates idle connections; keep the
    // pool small and let it recycle rather than holding sockets open.
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

const globalForDb = globalThis as unknown as {
  __qbankPool?: Pool;
  __qbankDb?: ReturnType<typeof drizzle<typeof schema>>;
};

export function getPool(): Pool {
  if (!globalForDb.__qbankPool) {
    globalForDb.__qbankPool = createPool();
  }
  return globalForDb.__qbankPool;
}

export function getDb() {
  if (!globalForDb.__qbankDb) {
    globalForDb.__qbankDb = drizzle(getPool(), { schema });
  }
  return globalForDb.__qbankDb;
}

export type Db = ReturnType<typeof getDb>;

export { schema };
