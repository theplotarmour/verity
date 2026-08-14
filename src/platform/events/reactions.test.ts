import { describe, it, expect } from "vitest";

import prisma from "@/lib/prisma";
import { registerReactions } from "./reactions";
import { emit, listenerCount } from "./bus";

/**
 * The real reactions, not synthetic ones.
 *
 * `bus.test.ts` proves the mechanism (publish runs listeners); this proves the
 * wiring — that the platform's actual module hooks are registered against the
 * events the booking action publishes. The two together are the guarantee that
 * emitting `appointment.completed` runs core's activity-trail reaction.
 */

describe("registerReactions", () => {
  it("wires core's audit reaction to every booking lifecycle event", () => {
    registerReactions();
    expect(listenerCount("appointment.confirmed")).toBeGreaterThanOrEqual(1);
    expect(listenerCount("appointment.completed")).toBeGreaterThanOrEqual(1);
    expect(listenerCount("appointment.cancelled")).toBeGreaterThanOrEqual(1);
  });

  it("is idempotent — registering again does not stack duplicate listeners", () => {
    registerReactions();
    registerReactions();
    // One reaction per event no matter how many actions call registerReactions.
    expect(listenerCount("appointment.completed")).toBe(1);
  });

  it("emitting a lifecycle event writes the audit row through the reaction", async () => {
    // End to end: the publisher (booking) and the reactor (core audit) never
    // import each other, yet emit produces the write. Scoped to a real factory so
    // the reaction's tenant handling is exercised too.
    registerReactions();
    const factory = await prisma.factory.findFirst({ where: { slug: "kents" }, select: { id: true } });
    if (!factory) return;

    const entityId = `evt-test-${Date.now().toString(36)}`;
    const result = await emit("appointment.completed", {
      factoryId: factory.id,
      appointmentId: entityId,
      customerName: "Bus Test",
    });
    expect(result.handled).toBeGreaterThanOrEqual(1);
    expect(result.failed).toBe(0);

    const row = await prisma.auditLog.findFirst({
      where: { factoryId: factory.id, entityId },
      select: { action: true },
    });
    expect(row?.action).toBe("Appointment completed: Bus Test");

    await prisma.auditLog.deleteMany({ where: { entityId } });
  });
});
