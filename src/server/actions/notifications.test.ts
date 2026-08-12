import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import prisma from "@/lib/prisma";
import { WARNINGS_QUEUE_LIMIT } from "@/lib/notifications";

/**
 * The warnings queue and its dismiss.
 *
 * Nothing in this codebase had ever written `Notification.read`, so the shell's
 * unread badge could only grow. The QC-score and stage-hold triggers made that
 * urgent: they are the first alerts that fire on their own rather than in reply to
 * something the reader did, so without a dismiss they accumulate for ever.
 *
 * The actions need a request context for the session, so the queue's *query* and
 * the *effect* of the update are exercised directly against the database — that is
 * where the behaviour lives.
 */
describe("warnings queue", () => {
  let factoryId: string;
  let userId: string;
  let seeded = false;
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const created: string[] = [];

  beforeAll(async () => {
    const factory = await prisma.factory.findFirst({ where: { slug: "carxen" } });
    if (!factory) return;
    factoryId = factory.id;
    const user = await prisma.user.findFirst({ where: { factoryId }, select: { id: true } });
    if (!user) return;
    userId = user.id;
    seeded = true;
  });

  afterAll(async () => {
    if (created.length > 0) {
      await prisma.notification.deleteMany({ where: { id: { in: created } } });
    }
    await prisma.$disconnect();
  });

  async function makeNotification(title: string, read = false) {
    const row = await prisma.notification.create({
      data: {
        factoryId,
        userId,
        title: `${title} ${suffix}`,
        message: `Body for ${title}`,
        type: "ACTION_REQUIRED",
        read,
      },
      select: { id: true },
    });
    created.push(row.id);
    return row.id;
  }

  /** The exact query the dashboard runs, narrowed to this test's rows. */
  async function readQueue() {
    const rows = await prisma.notification.findMany({
      where: { factoryId, read: false, id: { in: created } },
      orderBy: { createdAt: "desc" },
      take: WARNINGS_QUEUE_LIMIT,
      select: { id: true, title: true },
    });
    return rows.map((r) => r.id);
  }

  /** The update the action performs. */
  async function dismiss(id: string, tenant = factoryId) {
    return prisma.notification.updateMany({
      where: { id, factoryId: tenant },
      data: { read: true },
    });
  }

  it("drops a dismissed notification from the queue and leaves the rest", async () => {
    if (!seeded) return;
    const first = await makeNotification("Machine failure");
    const second = await makeNotification("QC audit failed");

    expect(await readQueue()).toEqual(expect.arrayContaining([first, second]));

    const result = await dismiss(first);
    expect(result.count).toBe(1);

    const after = await readQueue();
    expect(after).not.toContain(first);
    expect(after).toContain(second);
  });

  it("marks read rather than deleting, so the recipient keeps the message", async () => {
    if (!seeded) return;
    // Dismissing is clearing your own queue, not destroying somebody's record.
    // The bell lists messages regardless of `read`, so the row has to survive.
    const id = await makeNotification("Stage stopped");
    await dismiss(id);

    const row = await prisma.notification.findUnique({
      where: { id },
      select: { read: true, message: true },
    });
    expect(row).not.toBeNull();
    expect(row!.read).toBe(true);
    expect(row!.message).toBeTruthy();
  });

  it("is idempotent — a double click succeeds twice", async () => {
    if (!seeded) return;
    // The filter matches on id and factory, deliberately *not* on `read: false`.
    // Adding that would make the second call match nothing, which the action
    // reports as "not found" — so a double click would look like a failure and the
    // optimistic UI would put the row back. Re-marking a read row is a no-op that
    // costs one update and keeps the second click honest.
    const id = await makeNotification("Double");
    expect((await dismiss(id)).count).toBe(1);
    expect((await dismiss(id)).count).toBe(1);

    const row = await prisma.notification.findUnique({ where: { id }, select: { read: true } });
    expect(row!.read).toBe(true);
    expect(await readQueue()).not.toContain(id);
  });

  it("will not dismiss another tenant's notification", async () => {
    if (!seeded) return;
    // updateMany with the factory in the filter, not update by id: the id is
    // guessable and `update` would additionally confirm the row exists by throwing.
    const id = await makeNotification("Tenant scoped");
    const result = await dismiss(id, "some-other-factory");
    expect(result.count).toBe(0);

    const row = await prisma.notification.findUnique({ where: { id }, select: { read: true } });
    expect(row!.read).toBe(false);
  });

  it("never shows an already-read notification", async () => {
    if (!seeded) return;
    const id = await makeNotification("Old news", true);
    expect(await readQueue()).not.toContain(id);
  });

  it("returns the newest first", async () => {
    if (!seeded) return;
    const older = await makeNotification("Older");
    await new Promise((r) => setTimeout(r, 10));
    const newer = await makeNotification("Newer");

    const queue = await readQueue();
    expect(queue.indexOf(newer)).toBeLessThan(queue.indexOf(older));
  });
});

describe("the dismiss action", () => {
  const source = readFileSync(path.resolve(__dirname, "notifications.ts"), "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "");

  it("derives the tenant from the session, never from an argument", () => {
    // "use server" module: every export is a public POST endpoint.
    expect(code).toMatch(/getActiveSessionUser\(\)/);
    expect(code).not.toMatch(/dismissNotification\([^)]*factoryId/);
  });

  it("uses updateMany with the factory in the filter", () => {
    expect(code).toMatch(
      /notification\.updateMany\(\{\s*where: \{ id: notificationId, factoryId: session\.factoryId \}/
    );
  });

  it("reports a miss instead of silently succeeding", () => {
    expect(code).toMatch(/count === 0/);
  });

  it("queries unread by the boolean the schema actually has", () => {
    // The PRD asked for `status: UNREAD` / `READ`. `Notification.read` has been a
    // boolean since the table was created; there is nothing to migrate.
    expect(code).toMatch(/read: false/);
    expect(code).toMatch(/data: \{ read: true \}/);
    expect(code).not.toMatch(/UNREAD/);
  });
});
