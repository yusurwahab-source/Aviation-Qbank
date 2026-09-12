import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Local development reads .env.local; hosted environments provide DATABASE_URL directly.
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
});
