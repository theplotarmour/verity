import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Vitest does not read .env (the Prisma CLI does, which is why migrations work
// without this). Without it DATABASE_URL is unset under the test runner and the
// tenant-isolation suite skips itself — reporting green while INV-001 goes
// unverified. Load it before any test module imports the Prisma client.
const envFile = resolve(process.cwd(), ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);
