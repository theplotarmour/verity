import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/platform/db";
import { assertRlsEnforceable, withTenant } from "@/server/platform/tenancy";
import { effectiveTimeZone, isValidTimeZone, workingMinutesBetween, zoneLabel } from "@/server/platform/temporal";
import {
  applyStateToClocks, clockIntentFor, remainingMinutes, startClock, sweepBreaches, urgencyFor,
} from "@/server/platform/sla";

/**
 * Temporal model and SLA substrate.
 * Authority: Bible V3 §1 [FACT], Bible V4 §5.B, EXE-SCH-001, MET-STA-004.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message = "temporal-sla.test.ts cannot run: DATABASE_URL is unset.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

const ENTITY = "verity.test.ticket";

describeDb("temporal model and SLA substrate", () => {
  const tenantId = randomUUID();
  let londonOrg: string, tokyoOrg: string, calendarId: string, policyId: string;

  beforeAll(async () => {
    await assertRlsEnforceable();
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.capabilityDefinition.create({
        data: { id: "verity.capability.sla_test", name: "SLA test", version: "1.0.0", entityTypes: [ENTITY] },
      });
      await admin.entityDefinition.create({
        data: { key: ENTITY, capability: "verity.capability.sla_test", class: "Persistent", tableName: "ticket" },
      });
    } finally { await admin.$disconnect(); }

    await withTenant(tenantId, async (tx) => {
      await tx.tenant.create({ data: { id: tenantId, name: "Temporal Tenant", timeZone: "Europe/London" } });
      londonOrg = (await tx.organization.create({ data: { tenantId, name: "London" } })).id;
      tokyoOrg = (await tx.organization.create({ data: { tenantId, name: "Tokyo", timeZone: "Asia/Tokyo" } })).id;

      const calendar = await tx.businessCalendar.create({
        data: { tenantId, name: "UK office hours", timeZone: "Europe/London" },
      });
      calendarId = calendar.id;
      // Monday–Friday, 09:00–17:00 local.
      await tx.businessHours.createMany({
        data: [1, 2, 3, 4, 5].map((weekday) => ({
          tenantId, calendarId, weekday, startMinute: 9 * 60, endMinute: 17 * 60,
        })),
      });
      await tx.businessHoliday.create({
        data: { tenantId, calendarId, localDate: "2026-09-07", name: "Test holiday" },
      });

      policyId = (await tx.slaPolicy.create({
        data: { tenantId, entityKey: ENTITY, name: "8 working hours", targetMinutes: 480, calendarId, precedence: 10 },
      })).id;
    });
  });

  afterAll(async () => {
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.$executeRaw`DELETE FROM tenant WHERE id = ${tenantId}::uuid`;
      await admin.$executeRaw`DELETE FROM entity_definition WHERE key = ${ENTITY}`;
      await admin.$executeRaw`DELETE FROM capability_definition WHERE id = 'verity.capability.sla_test'`;
    } finally { await admin.$disconnect(); }
    await prisma.$disconnect();
  });

  /* ------------------------------ temporal ------------------------------ */

  it("resolves an organization's own zone before the tenant's", async () => {
    expect(await withTenant(tenantId, (tx) => effectiveTimeZone(tx, tokyoOrg))).toBe("Asia/Tokyo");
  });

  it("falls back to the tenant zone when an organization declares none", async () => {
    expect(await withTenant(tenantId, (tx) => effectiveTimeZone(tx, londonOrg))).toBe("Europe/London");
  });

  it("rejects a timezone the database does not recognise", async () => {
    expect(await withTenant(tenantId, (tx) => isValidTimeZone(tx, "Europe/London"))).toBe(true);
    expect(await withTenant(tenantId, (tx) => isValidTimeZone(tx, "Middle/Earth"))).toBe(false);
  });

  it("refuses to store an invalid zone", async () => {
    await expect(
      withTenant(tenantId, (tx) =>
        tx.organization.create({ data: { tenantId, name: "Bad", timeZone: "Not/AZone" } }),
      ),
    ).rejects.toThrow();
  });

  it("handles daylight saving rather than a fixed offset", () => {
    // The same zone reports different abbreviations across the DST boundary; a
    // stored offset would be wrong for half the year.
    const winter = zoneLabel(new Date("2026-01-15T12:00:00Z"), "Europe/London");
    const summer = zoneLabel(new Date("2026-07-15T12:00:00Z"), "Europe/London");
    expect(winter).not.toBe(summer);
  });

  /* --------------------------- working minutes -------------------------- */

  it("counts only declared working hours", async () => {
    // Tuesday 09:00 → 17:00 London is exactly one working day.
    const minutes = await withTenant(tenantId, (tx) =>
      workingMinutesBetween(tx, calendarId, new Date("2026-09-01T08:00:00Z"), new Date("2026-09-01T16:00:00Z")),
    );
    expect(minutes).toBe(480);
  });

  it("does not count a weekend", async () => {
    // Saturday to Sunday: no working windows declared.
    const minutes = await withTenant(tenantId, (tx) =>
      workingMinutesBetween(tx, calendarId, new Date("2026-09-05T08:00:00Z"), new Date("2026-09-06T20:00:00Z")),
    );
    expect(minutes).toBe(0);
  });

  it("excludes a declared holiday", async () => {
    // 2026-09-07 is a Monday marked as a holiday.
    const minutes = await withTenant(tenantId, (tx) =>
      workingMinutesBetween(tx, calendarId, new Date("2026-09-07T08:00:00Z"), new Date("2026-09-07T16:00:00Z")),
    );
    expect(minutes).toBe(0);
  });

  it("measures wall-clock time when no calendar applies", async () => {
    const minutes = await withTenant(tenantId, (tx) =>
      workingMinutesBetween(tx, null, new Date("2026-09-05T08:00:00Z"), new Date("2026-09-05T10:00:00Z")),
    );
    expect(minutes).toBe(120);
  });

  /* ------------------------------ SLA clock ----------------------------- */

  it("maps every state category onto a clock intent (MET-STA-004)", () => {
    expect(clockIntentFor("Draft")).toBe("idle");
    expect(clockIntentFor("Active")).toBe("start");
    expect(clockIntentFor("Pending")).toBe("pause");
    expect(clockIntentFor("Blocked")).toBe("pause");
    expect(clockIntentFor("Completed")).toBe("stop");
    expect(clockIntentFor("Cancelled")).toBe("stop");
  });

  it("starts, pauses and resumes without restarting the allowance", async () => {
    const subject = randomUUID();
    const started = await withTenant(tenantId, (tx) =>
      startClock(tx, { tenantId, entityKey: ENTITY, entityId: subject }),
    );
    expect(started).not.toBeNull();

    const t0 = new Date("2026-09-01T09:00:00Z");
    await withTenant(tenantId, (tx) =>
      applyStateToClocks(tx, { entityKey: ENTITY, entityId: subject, category: "Active", now: t0 }),
    );

    // Two working hours later, block it.
    const t1 = new Date("2026-09-01T11:00:00Z");
    await withTenant(tenantId, (tx) =>
      applyStateToClocks(tx, { entityKey: ENTITY, entityId: subject, category: "Blocked", now: t1 }),
    );

    const paused = await withTenant(tenantId, (tx) =>
      tx.slaClock.findFirstOrThrow({ where: { entityId: subject } }),
    );
    expect(paused.status).toBe("Paused");
    expect(paused.elapsedMinutes).toBe(120);

    // Resume a week later: the budget resumes, it does not reset.
    const t2 = new Date("2026-09-08T09:00:00Z");
    await withTenant(tenantId, (tx) =>
      applyStateToClocks(tx, { entityKey: ENTITY, entityId: subject, category: "Active", now: t2 }),
    );
    const resumed = await withTenant(tenantId, (tx) =>
      tx.slaClock.findFirstOrThrow({ where: { entityId: subject } }),
    );
    expect(resumed.status).toBe("Running");
    expect(resumed.elapsedMinutes).toBe(120);

    const left = await withTenant(tenantId, (tx) => remainingMinutes(tx, resumed.id, t2));
    expect(left).toBe(360);
  });

  it("emits clock facts as platform events", async () => {
    const subject = randomUUID();
    await withTenant(tenantId, (tx) => startClock(tx, { tenantId, entityKey: ENTITY, entityId: subject }));
    const events = await withTenant(tenantId, (tx) =>
      applyStateToClocks(tx, { entityKey: ENTITY, entityId: subject, category: "Active" }),
    );
    expect(events.map((e) => e.name)).toContain("verity.sla.clock_started");
  });

  it("stops the clock and freezes elapsed time", async () => {
    const subject = randomUUID();
    await withTenant(tenantId, (tx) => startClock(tx, { tenantId, entityKey: ENTITY, entityId: subject }));
    await withTenant(tenantId, (tx) =>
      applyStateToClocks(tx, { entityKey: ENTITY, entityId: subject, category: "Active", now: new Date("2026-09-01T09:00:00Z") }),
    );
    const events = await withTenant(tenantId, (tx) =>
      applyStateToClocks(tx, { entityKey: ENTITY, entityId: subject, category: "Completed", now: new Date("2026-09-01T12:00:00Z") }),
    );
    expect(events.map((e) => e.name)).toContain("verity.sla.clock_stopped");

    const stopped = await withTenant(tenantId, (tx) =>
      tx.slaClock.findFirstOrThrow({ where: { entityId: subject } }),
    );
    expect(stopped.status).toBe("Stopped");
    expect(stopped.elapsedMinutes).toBe(180);
    expect(stopped.breachedAt).toBeNull();
  });

  it("records a breach even when the record later completes", async () => {
    const subject = randomUUID();
    await withTenant(tenantId, (tx) => startClock(tx, { tenantId, entityKey: ENTITY, entityId: subject }));
    await withTenant(tenantId, (tx) =>
      applyStateToClocks(tx, { entityKey: ENTITY, entityId: subject, category: "Active", now: new Date("2026-09-01T09:00:00Z") }),
    );
    // Three working days later — far beyond an 8-working-hour target.
    await withTenant(tenantId, (tx) =>
      applyStateToClocks(tx, { entityKey: ENTITY, entityId: subject, category: "Completed", now: new Date("2026-09-04T16:00:00Z") }),
    );
    const stopped = await withTenant(tenantId, (tx) =>
      tx.slaClock.findFirstOrThrow({ where: { entityId: subject } }),
    );
    // Finishing must not launder the fact that it ran over.
    expect(stopped.breachedAt).not.toBeNull();
  });

  it("sweeps overdue clocks idempotently", async () => {
    const subject = randomUUID();
    await withTenant(tenantId, (tx) => startClock(tx, { tenantId, entityKey: ENTITY, entityId: subject }));
    await withTenant(tenantId, (tx) =>
      applyStateToClocks(tx, { entityKey: ENTITY, entityId: subject, category: "Active", now: new Date("2026-09-01T09:00:00Z") }),
    );

    const later = new Date("2026-09-30T09:00:00Z");
    const first = await withTenant(tenantId, (tx) => sweepBreaches(tx, later));
    expect(first.some((e) => e.name === "verity.sla.breached")).toBe(true);

    // Breach is time passing, so the sweep must be safe to run repeatedly.
    const second = await withTenant(tenantId, (tx) => sweepBreaches(tx, later));
    expect(second.some((e) => e.payload?.clockId === first[0]?.payload?.clockId)).toBe(false);
  });

  it("separates urgency from priority (Bible V4 §5.B)", () => {
    expect(urgencyFor(-5, 480)).toBe("breached");
    expect(urgencyFor(10, 480)).toBe("critical");
    expect(urgencyFor(60, 480)).toBe("high");
    expect(urgencyFor(200, 480)).toBe("medium");
    expect(urgencyFor(470, 480)).toBe("low");
    expect(urgencyFor(null, 480)).toBe("none");
  });

  it("keeps clocks invisible to another tenant", async () => {
    const other = randomUUID();
    await withTenant(other, (tx) => tx.tenant.create({ data: { id: other, name: "Other" } }));
    const seen = await withTenant(other, (tx) => tx.slaClock.count());
    expect(seen).toBe(0);
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try { await admin.$executeRaw`DELETE FROM tenant WHERE id = ${other}::uuid`; }
    finally { await admin.$disconnect(); }
  });
});
