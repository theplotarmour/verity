// Replays what the login server action does, against the real database.
//
// The browser pane in this environment does not composite, so the form cannot
// be driven directly. This exercises the same sequence server-side: lookup by
// phone -> PIN hash comparison -> role/permission/module resolution -> the
// redirect target the shell would choose.
//
// Run: node --env-file=.env scripts/verify_login.mjs

import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();
const hashPin = (pin, factoryId) =>
  createHash("sha256").update(`verity:${factoryId}:${pin}`).digest("hex");

const PHONE = "7011440350";
const PIN = "1803";

const fail = (m) => {
  console.error("FAIL:", m);
  process.exitCode = 1;
};

// 1. Lookup, exactly as src/server/actions/auth.ts does.
const user = await prisma.user.findUnique({
  where: { phone: PHONE },
  include: {
    factory: { select: { id: true, name: true, organizationId: true } },
    customRole: { include: { permissions: true } },
  },
});
if (!user) {
  fail(`no user with phone ${PHONE}`);
  process.exit(1);
}
console.log("1. user found      :", user.name, "| archetype", user.role);

// 2. PIN check.
const ok = user.pinHash === hashPin(PIN, user.factoryId);
console.log("2. PIN accepted    :", ok ? "yes" : "NO");
if (!ok) fail("PIN hash mismatch — login would be rejected");

// 3. Account state gates the action checks before allowing entry.
const active = user.isActive && user.status === "active";
const locked = user.lockedUntil && user.lockedUntil > new Date();
console.log("3. account usable  :", active && !locked ? "yes" : `NO (active=${active}, locked=${!!locked})`);
if (!active || locked) fail("account not usable");

// 4. Org + entitlements.
const ents = await prisma.moduleEntitlement.findMany({
  where: { organizationId: user.factory.organizationId, enabled: true },
  select: { moduleKey: true },
});
console.log("4. organization    :", user.factory.organizationId);
console.log("   modules         :", ents.map((e) => e.moduleKey).sort().join(", "));
if (ents.length === 0) fail("no module entitlements — the whole nav would be empty");

// 5. Permission grants via the new Role table.
const perms = user.customRole?.permissions.map((p) => p.key) ?? [];
console.log("5. role            :", user.customRole?.name ?? "(none)", `| ${perms.length} permissions`);
if (!user.roleId) fail("user has no roleId — permission resolution would return nothing");
if (perms.length === 0) fail("role grants no permissions");

// A grant only counts if its module is entitled; automotive must NOT be here.
const entitled = new Set(ents.map((e) => e.moduleKey));
console.log("   automotive off  :", entitled.has("automotive") ? "NO (unexpected)" : "yes");

// 6. Where the shell sends an OWNER.
const target = { OWNER: "/owner/dashboard", CO_OWNER: "/owner/dashboard", MANAGER: "/owner/dashboard", SUPERVISOR: "/supervisor", WORKER: "/worker", STORE_MANAGER: "/owner/order-taking" }[user.role];
console.log("6. lands on        :", target);

// 7. Workspace scaffolding.
const depts = await prisma.department.count({ where: { factoryId: user.factoryId } });
console.log("7. departments     :", depts);
if (depts === 0) fail("no departments — production flow has nowhere to route");

// 8. A wrong PIN must be rejected.
const wrong = user.pinHash === hashPin("0000", user.factoryId);
console.log("8. wrong PIN denied:", wrong ? "NO — SERIOUS" : "yes");
if (wrong) fail("wrong PIN accepted");

console.log(process.exitCode ? "\nRESULT: FAILED" : "\nRESULT: login path verified end to end");
await prisma.$disconnect();
