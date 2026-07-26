// Seeds the PlotArmour Store tenant.
//
// Standalone rather than importing @/platform/tenancy/provision, which is
// marked "server-only" and cannot run outside Next. The shape must stay in
// step with provisionTenant(): Organization -> Factory -> system Roles with
// grants -> module entitlements.
//
// Idempotent: re-running updates the owner's PIN rather than failing on the
// unique phone constraint.
//
// Run: node --env-file=.env scripts/seed_plotarmour.mjs

import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

// Must match src/lib/server/hash.ts exactly, salt included.
const hashPin = (pin, factoryId) =>
  createHash("sha256").update(`verity:${factoryId}:${pin}`).digest("hex");

const ORG_NAME = "PlotArmour Store";
const SLUG = "plotarmour-store";
const OWNER_NAME = "PlotArmour Owner";
const OWNER_PHONE = "7011440350";
const OWNER_PIN = "1803";

// Horizontal modules only — no automotive pack. This tenant is the proof that
// a non-vehicle business can be provisioned without the vertical.
const MODULES = ["core", "inventory", "manufacturing", "quality", "procurement", "sales", "hr"];

const GRANTS = {
  OWNER: [
    "dashboard.view", "settings.access", "branding.access", "billing.access",
    "master_data.access", "team.manage", "team.assign_roles",
    "org.transfer_ownership", "reports.view", "reports.export",
    "product_type.manage", "item.view", "item.manage", "stock.view",
    "stock.adjust", "stock.transfer", "warehouse.manage", "bom.view",
    "bom.manage", "work_order.create", "work_order.release",
    "quality.queue", "quality.inspect", "quality.approve",
    "quality.template_manage", "quality.passport_publish",
    "supplier.manage", "purchase_request.create", "purchase_order.create",
    "purchase_order.approve", "purchase_receipt.record",
    "sales_order.view", "sales_order.create", "sales_order.delete",
    "sales_order.approve", "dispatch.record", "customer.manage",
    "employee.view", "employee.manage", "attendance.record", "leave.approve",
  ],
  CO_OWNER: [
    "dashboard.view", "settings.access", "branding.access", "master_data.access",
    "team.manage", "team.assign_roles", "reports.view", "reports.export",
    "product_type.manage", "item.view", "item.manage", "stock.view",
    "sales_order.view", "sales_order.create", "sales_order.approve",
    "customer.manage", "quality.queue", "quality.approve",
  ],
  MANAGER: [
    "dashboard.view", "master_data.access", "team.manage", "reports.view",
    "reports.export", "item.view", "stock.view", "stock.adjust",
    "work_order.create", "work_order.release", "sales_order.view",
    "sales_order.create", "customer.manage", "purchase_request.create",
  ],
  SUPERVISOR: [
    "dashboard.view", "reports.view", "quality.queue", "quality.inspect",
    "production.supervise", "stock.view",
  ],
  WORKER: ["production.jobs"],
  STORE_MANAGER: ["dashboard.view", "sales_order.view", "sales_order.create", "customer.manage"],
};

const ROLE_LABELS = {
  OWNER: "Owner", CO_OWNER: "Co-Owner", MANAGER: "Manager",
  SUPERVISOR: "Supervisor", WORKER: "Worker", STORE_MANAGER: "Store Manager",
};

// A production chain, generic rather than seat-cover specific.
const DEPARTMENTS = [
  { name: "Order Intake",  sortOrder: 1, isQcStage: false, requirePhoto: false, requireRemarks: false },
  { name: "Preparation",   sortOrder: 2, isQcStage: false, requirePhoto: true,  requireRemarks: false },
  { name: "Assembly",      sortOrder: 3, isQcStage: false, requirePhoto: true,  requireRemarks: false },
  { name: "Quality Check", sortOrder: 4, isQcStage: true,  requirePhoto: true,  requireRemarks: true  },
  { name: "Packing",       sortOrder: 5, isQcStage: false, requirePhoto: false, requireRemarks: false },
  { name: "Dispatch",      sortOrder: 6, isQcStage: false, requirePhoto: false, requireRemarks: false },
];

async function main() {
  const existingFactory = await prisma.factory.findUnique({ where: { slug: SLUG } });

  const org = existingFactory
    ? await prisma.organization.findUniqueOrThrow({ where: { id: existingFactory.organizationId } })
    : await prisma.organization.create({
        data: { name: ORG_NAME, slug: SLUG, currency: "INR", timezone: "Asia/Kolkata" },
      });

  const factory =
    existingFactory ??
    (await prisma.factory.create({
      data: {
        organizationId: org.id,
        name: ORG_NAME,
        slug: SLUG,
        industry: "Retail & Assembly",
        onboardingStatus: "LIVE",
        settings: {},
      },
    }));

  await prisma.moduleEntitlement.createMany({
    data: MODULES.map((moduleKey) => ({ organizationId: org.id, moduleKey, enabled: true })),
    skipDuplicates: true,
  });

  const entitled = new Set(MODULES);
  const roleIds = {};
  for (const [archetype, keys] of Object.entries(GRANTS)) {
    const existing = await prisma.role.findFirst({
      where: { organizationId: org.id, systemRole: archetype, isSystem: true },
    });
    if (existing) {
      roleIds[archetype] = existing.id;
      continue;
    }
    const role = await prisma.role.create({
      data: {
        organizationId: org.id,
        name: ROLE_LABELS[archetype],
        description: "Built-in role. Rename or copy it; it cannot be deleted.",
        systemRole: archetype,
        isSystem: true,
        permissions: { create: keys.map((key) => ({ key })) },
      },
    });
    roleIds[archetype] = role.id;
  }

  for (const d of DEPARTMENTS) {
    await prisma.department.upsert({
      where: { factoryId_name: { factoryId: factory.id, name: d.name } },
      update: {},
      create: { factoryId: factory.id, ...d, requiresApproval: true, active: true },
    });
  }

  const pinHash = hashPin(OWNER_PIN, factory.id);
  const owner = await prisma.user.upsert({
    where: { phone: OWNER_PHONE },
    update: {
      name: OWNER_NAME, factoryId: factory.id, role: "OWNER",
      roleId: roleIds.OWNER, pinHash, isActive: true, status: "active",
      failedAttempts: 0, lockedUntil: null,
    },
    create: {
      factoryId: factory.id, name: OWNER_NAME, phone: OWNER_PHONE,
      role: "OWNER", roleId: roleIds.OWNER, pinHash,
      isActive: true, language: "en",
    },
  });

  console.log("Organization :", org.name, `(${org.id})`);
  console.log("Factory      :", factory.name, `(${factory.id})`);
  console.log("Modules      :", MODULES.join(", "));
  console.log("Roles        :", Object.keys(roleIds).length, "seeded");
  console.log("Departments  :", DEPARTMENTS.length);
  console.log("Owner        :", owner.name, "/ phone", owner.phone, "/ PIN", OWNER_PIN);
  console.log("Owner roleId :", owner.roleId);

  // Prove the stored hash matches what the login path will compute.
  const verify = hashPin(OWNER_PIN, factory.id) === owner.pinHash;
  console.log("PIN verifies :", verify ? "YES" : "NO — login would fail");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
