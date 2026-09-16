import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Audit-only runner for pure tests that do not touch the configured database.
 * The repository's normal setup correctly refuses its remote DATABASE_URL;
 * this config supplies only the path alias and intentionally has no setup file.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
      "server-only": path.resolve(process.cwd(), "src/test/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    exclude: [".claude/**", "node_modules/**", "graphify-out/**"],
    pool: "forks",
    maxWorkers: 1,
  },
});
