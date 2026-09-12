import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
  },
  resolve: {
    alias: {
      // Must come before "@" so it is matched first.
      "server-only": path.resolve(import.meta.dirname, "./tests/stubs/server-only.ts"),
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
