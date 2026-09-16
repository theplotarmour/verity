import { readFile } from "node:fs/promises";
import { parse } from "yaml";

const root = new URL("../", import.meta.url);
const [composeSource, dockerfile, nextConfig, packageSource] = await Promise.all([
  readFile(new URL("deploy/compose/docker-compose.yml", root), "utf8"),
  readFile(new URL("Dockerfile", root), "utf8"),
  readFile(new URL("next.config.ts", root), "utf8"),
  readFile(new URL("package.json", root), "utf8"),
]);

const compose = parse(composeSource);
const webEnvironment = compose?.services?.web?.environment ?? {};
const toolsEnvironment = compose?.services?.tools?.environment ?? {};
const schedulerEnvironment = compose?.services?.scheduler?.environment ?? {};
const packageJson = JSON.parse(packageSource);
const failures = [];

if (Object.hasOwn(webEnvironment, "DIRECT_URL")) {
  failures.push("web service must not receive DIRECT_URL");
}
if (!Object.hasOwn(toolsEnvironment, "DIRECT_URL")) {
  failures.push("tools service must retain the migration-only DIRECT_URL");
}
if (!String(webEnvironment.DATABASE_URL ?? "").includes("verity_app")) {
  failures.push("web DATABASE_URL must use the non-bypass runtime role");
}
if (!compose?.services?.scheduler) {
  failures.push("on-prem compose must package the scheduler service");
}
if (!Object.hasOwn(schedulerEnvironment, "CRON_SECRET")) {
  failures.push("scheduler must receive its dedicated trigger secret");
}
for (const forbidden of ["DATABASE_URL", "DIRECT_URL", "VERITY_SESSION_SECRET", "SUPABASE_SERVICE_ROLE_KEY", "VERITY_S3_SECRET_ACCESS_KEY"]) {
  if (Object.hasOwn(schedulerEnvironment, forbidden)) {
    failures.push(`scheduler must not receive ${forbidden}`);
  }
}
if (!dockerfile.startsWith("# Verity") || !dockerfile.includes("FROM node:22-bookworm-slim AS base")) {
  failures.push("all container stages must inherit the pinned Node 22 base line");
}
if (packageJson.engines?.node !== "22.x") {
  failures.push("package.json must declare the Node 22 runtime line");
}
if (nextConfig.includes("hostname: '*.supabase.co'")) {
  failures.push("Next image optimization must not trust every Supabase tenant");
}

if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  process.exitCode = 1;
} else {
  console.log("deployment security invariants are present");
}
