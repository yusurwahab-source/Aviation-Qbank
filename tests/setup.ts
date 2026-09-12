import { config } from "dotenv";

/**
 * Runs before each test file.
 *
 * Loads DATABASE_URL so the integration tests can find a database. They skip
 * themselves when there is none, so this failing to find a file is fine.
 */
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
