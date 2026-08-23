import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./src/test/setup-env.ts"],
    // These are integration tests against a real (often remote) PostgreSQL, and
    // a single replay step is a network round trip. The 5s default fails on
    // latency rather than on behaviour, which is the worst kind of red test.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // `server-only` throws at import time outside a Next bundle, which made
      // every module carrying it untestable — and the workaround was to drop the
      // marker from modules that genuinely needed it.
      //
      // Stubbing it here costs nothing: the guard's real job is to fail the
      // *build* when a server module reaches a client bundle, and that is
      // enforced by Next's bundler, not by this runner.
      "server-only": path.resolve(__dirname, "src/test/server-only-stub.ts"),
    },
  },
});
