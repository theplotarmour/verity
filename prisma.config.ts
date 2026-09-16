import { defineConfig } from "prisma/config";

// Prisma starts before application configuration is available. Node 22's
// built-in loader keeps the existing root .env behavior without adding a
// runtime package solely for CLI configuration. CI supplies variables
// directly, so a missing .env file is expected there.
try {
  process.loadEnvFile();
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/run-seed.cjs seed-plywood-demo.ts",
  },
});
