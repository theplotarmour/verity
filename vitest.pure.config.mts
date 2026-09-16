import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  envDir: false,
  test: {
    environment: "node",
    include: [
      "src/test/config.test.ts",
      "src/test/health-readiness.test.ts",
      "src/test/observability.test.ts",
      "src/server/platform/telemetry-scrub.test.ts",
      "src/server/capabilities/trading/import.test.ts",
      "src/server/capabilities/trading/clock.test.ts",
    ],
    setupFiles: ["./src/test/setup-pure-env.ts"],
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "src/test/server-only-stub.ts"),
    },
  },
});
