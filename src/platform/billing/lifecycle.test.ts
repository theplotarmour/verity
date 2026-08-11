import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import prisma from "@/lib/prisma";
import { runSubscriptionLifecycle } from "./lifecycle";
import { PACK_PRICE, TRIAL } from "@/platform/pricing";

/**
 * The subscription lifecycle, against the real database.
 *
 * The dangerous direction is over-eager: freezing a tenant who should still be
 * writable, or warning one whose retention has not elapsed. A trial that expires
 * a day late costs nothing; one that expires a day early takes a paying
 * prospect's workspace away mid-evaluation.
 *
 * So the boundaries are tested on both sides, and `now` is injected rather than
 * waiting seven days.
 */
describe("subscription lifecycle", () => {
  const orgIds: string[] = [];
  let seeded = false;

  async function makeOrg(label: string) {
    const org = await prisma.organization.create({
      data: { name: `Lifecycle ${label}`, slug: `lifecycle-${label}-${Date.now().toString(36)}` },
      select: { id: true },
    });
    orgIds.push(org.id);
    return org.id;
  }

  async function makeSubscription(
    organizationId: string,
    data: Partial<Parameters<typeof prisma.tenantSubscription.create>[0]["data"]> = {},
  ) {
    return prisma.tenantSubscription.create({
      data: {
        organizationId,
        status: "TRIAL",
        basePrice: PACK_PRICE.franchise_qsr,
        currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
        ...data,
      } as never,
      select: { id: true },
    });
  }

  beforeAll(() => {
    seeded = true;
  });

  afterAll(async () => {
    for (const id of orgIds) {
      await prisma.organization.delete({ where: { id } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  it("expires a trial whose time has passed", async () => {
    if (!seeded) return;
    const org = await makeOrg("expired");
    const yesterday = new Date(Date.now() - 86_400_000);
    const { id } = await makeSubscription(org, { trialEndsAt: yesterday });

    const report = await runSubscriptionLifecycle();
    expect(report.trialsExpired).toContain(org);

    const after = await prisma.tenantSubscription.findUniqueOrThrow({
      where: { id },
      select: { status: true, readOnlySince: true },
    });
    expect(after.status).toBe("TRIAL_EXPIRED");
    // The retention clock starts here, not at trialEndsAt.
    expect(after.readOnlySince).toBeInstanceOf(Date);
  });

  it("leaves a trial with time remaining alone", async () => {
    if (!seeded) return;
    // The dangerous direction. A trial expiring early takes a prospect's
    // workspace away mid-evaluation.
    const org = await makeOrg("live");
    const tomorrow = new Date(Date.now() + 86_400_000);
    const { id } = await makeSubscription(org, { trialEndsAt: tomorrow });

    const report = await runSubscriptionLifecycle();
    expect(report.trialsExpired).not.toContain(org);

    const after = await prisma.tenantSubscription.findUniqueOrThrow({
      where: { id },
      select: { status: true, readOnlySince: true },
    });
    expect(after.status).toBe("TRIAL");
    expect(after.readOnlySince).toBeNull();
  });

  it("is idempotent — a second pass finds nothing", async () => {
    if (!seeded) return;
    // A cron that fires twice must not re-stamp readOnlySince, or the retention
    // window restarts every night and the data is never released.
    const org = await makeOrg("idempotent");
    await makeSubscription(org, { trialEndsAt: new Date(Date.now() - 86_400_000) });

    await runSubscriptionLifecycle();
    const first = await prisma.tenantSubscription.findUniqueOrThrow({
      where: { organizationId: org },
      select: { readOnlySince: true },
    });

    const second = await runSubscriptionLifecycle();
    expect(second.trialsExpired).not.toContain(org);

    const after = await prisma.tenantSubscription.findUniqueOrThrow({
      where: { organizationId: org },
      select: { readOnlySince: true },
    });
    expect(after.readOnlySince?.getTime()).toBe(first.readOnlySince?.getTime());
  });

  it("reports a nudge two days out but does not change the status", async () => {
    if (!seeded) return;
    const org = await makeOrg("nudge");
    // Day 5 of 7 → two days left.
    const inTwoDays = new Date(Date.now() + 2 * 86_400_000 - 60_000);
    const { id } = await makeSubscription(org, { trialEndsAt: inTwoDays });

    const report = await runSubscriptionLifecycle();
    expect(report.nudgesDue).toContain(org);

    // A nudge is a conversation, not a state change.
    const after = await prisma.tenantSubscription.findUniqueOrThrow({
      where: { id },
      select: { status: true },
    });
    expect(after.status).toBe("TRIAL");
  });

  it("does not nudge a trial with a week left", async () => {
    if (!seeded) return;
    const org = await makeOrg("early");
    await makeSubscription(org, { trialEndsAt: new Date(Date.now() + 7 * 86_400_000) });

    const report = await runSubscriptionLifecycle();
    expect(report.nudgesDue).not.toContain(org);
  });

  it("warns at the retention window without deleting anything", async () => {
    if (!seeded) return;
    const org = await makeOrg("retention");
    const longAgo = new Date(Date.now() - (TRIAL.readOnlyRetentionDays + 2) * 86_400_000);
    await makeSubscription(org, {
      status: "TRIAL_EXPIRED",
      trialEndsAt: longAgo,
      readOnlySince: longAgo,
    });

    const before = await prisma.tenantSubscription.count({ where: { organizationId: org } });
    const report = await runSubscriptionLifecycle();
    const after = await prisma.tenantSubscription.count({ where: { organizationId: org } });

    expect(report.deletionWarnings).toContain(org);
    // The whole point. The warning is automatic; the deletion is a human.
    expect(after).toBe(before);
    expect(
      await prisma.organization.count({ where: { id: org } }),
      "the lifecycle pass deleted an organisation",
    ).toBe(1);
  });

  it("does not warn inside the retention window", async () => {
    if (!seeded) return;
    const org = await makeOrg("recent");
    const recent = new Date(Date.now() - 2 * 86_400_000);
    await makeSubscription(org, {
      status: "TRIAL_EXPIRED",
      trialEndsAt: recent,
      readOnlySince: recent,
    });

    const report = await runSubscriptionLifecycle();
    expect(report.deletionWarnings).not.toContain(org);
  });

  it("does not freeze an active subscription with no unpaid invoice", async () => {
    if (!seeded) return;
    const org = await makeOrg("paid");
    const { id } = await makeSubscription(org, { status: "ACTIVE", trialEndsAt: null });

    await runSubscriptionLifecycle();
    const after = await prisma.tenantSubscription.findUniqueOrThrow({
      where: { id },
      select: { status: true },
    });
    expect(after.status).toBe("ACTIVE");
  });

  it("freezes an active subscription with an issued, unpaid, past-period invoice", async () => {
    if (!seeded) return;
    const org = await makeOrg("overdue");
    const { id } = await makeSubscription(org, { status: "ACTIVE", trialEndsAt: null });

    const start = new Date(Date.now() - 60 * 86_400_000);
    const end = new Date(Date.now() - 30 * 86_400_000);
    await prisma.platformInvoice.create({
      data: {
        subscriptionId: id,
        organizationId: org,
        invoiceNumber: `TEST-${Date.now()}`,
        periodStart: start,
        periodEnd: end,
        subtotal: 1000,
        total: 1000,
        status: "ISSUED",
      },
    });

    const report = await runSubscriptionLifecycle();
    expect(report.lapsed).toContain(org);

    const after = await prisma.tenantSubscription.findUniqueOrThrow({
      where: { id },
      select: { status: true, readOnlySince: true },
    });
    expect(after.status).toBe("READ_ONLY");
    expect(after.readOnlySince).toBeInstanceOf(Date);
  });

  it("ignores a draft invoice, because an unissued bill is our failure", async () => {
    if (!seeded) return;
    // Freezing a tenant for an invoice we never sent them is indefensible.
    const org = await makeOrg("draft");
    const { id } = await makeSubscription(org, { status: "ACTIVE", trialEndsAt: null });

    await prisma.platformInvoice.create({
      data: {
        subscriptionId: id,
        organizationId: org,
        invoiceNumber: `TESTDRAFT-${Date.now()}`,
        periodStart: new Date(Date.now() - 60 * 86_400_000),
        periodEnd: new Date(Date.now() - 30 * 86_400_000),
        subtotal: 1000,
        total: 1000,
        status: "DRAFT",
      },
    });

    const report = await runSubscriptionLifecycle();
    expect(report.lapsed).not.toContain(org);
    expect(
      (await prisma.tenantSubscription.findUniqueOrThrow({ where: { id }, select: { status: true } }))
        .status,
    ).toBe("ACTIVE");
  });
});

describe("the cron route", () => {
  const route = readFileSync(
    path.resolve(__dirname, "../../app/api/cron/subscriptions/route.ts"),
    "utf8",
  );
  const auth = readFileSync(path.resolve(__dirname, "../../lib/server/cron-auth.ts"), "utf8");

  it("is guarded by CRON_SECRET", () => {
    expect(route).toMatch(/cronAuthorized\(request\)/);
    expect(auth).toMatch(/process\.env\.CRON_SECRET/);
  });

  it("compares in constant time", () => {
    expect(auth).toMatch(/timingSafeEqual/);
    // A plain === would miss the whole point. Checked against the code with
    // comments stripped — the first version of this assertion failed because the
    // doc comment in cron-auth.ts *names* the mistake it is warning against.
    const code = auth.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "");
    expect(code).not.toMatch(/return\s+provided\s*===\s*expected/);
  });

  it("fails closed when the secret is unset", () => {
    // Without this, a deployment missing CRON_SECRET exposes an endpoint that
    // can freeze every tenant on the platform.
    expect(auth).toMatch(/if \(!expected\) return false;/);
  });

  it("shares one auth implementation with the webhook drain", () => {
    const drain = readFileSync(
      path.resolve(__dirname, "../../app/api/webhooks/drain/route.ts"),
      "utf8",
    );
    expect(drain).toMatch(/cronAuthorized/);
    // A second copy of a constant-time comparison is a second chance to write
    // `===` by accident.
    expect(drain).not.toMatch(/timingSafeEqual/);
  });

  it("never deletes", () => {
    const lifecycle = readFileSync(path.resolve(__dirname, "lifecycle.ts"), "utf8");
    expect(lifecycle).not.toMatch(/\.delete\(|\.deleteMany\(/);
  });
});
