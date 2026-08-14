import { describe, it, expect, beforeEach, vi } from "vitest";

import { on, emit, listenerCount, __clearListeners } from "./bus";

/**
 * The platform event bus.
 *
 * The property the whole composition model rests on: publishing an event runs the
 * listeners registered for it, and a listener that fails cannot take down the
 * publisher or its siblings. If either half breaks, "booking.completed triggers
 * billing" stops being a guarantee and becomes a hope.
 */

beforeEach(() => __clearListeners());

describe("publish and react", () => {
  it("runs the listener registered for an event, with the payload", async () => {
    const seen: unknown[] = [];
    on("booking.completed", (p) => void seen.push(p));

    const result = await emit("booking.completed", { factoryId: "fac_1", appointmentId: "appt_1" });

    expect(seen).toEqual([{ factoryId: "fac_1", appointmentId: "appt_1" }]);
    expect(result).toEqual({ event: "booking.completed", handled: 1, failed: 0 });
  });

  it("runs every listener for the event", async () => {
    const calls: string[] = [];
    on("appointment.no_show", () => void calls.push("billing"));
    on("appointment.no_show", () => void calls.push("crm"));

    const result = await emit("appointment.no_show", { factoryId: "fac_1" });

    expect(calls.sort()).toEqual(["billing", "crm"]);
    expect(result.handled).toBe(2);
  });

  it("awaits async listeners before resolving", async () => {
    let done = false;
    on("booking.completed", async () => {
      await new Promise((r) => setTimeout(r, 5));
      done = true;
    });

    await emit("booking.completed", { factoryId: "fac_1" });
    expect(done).toBe(true);
  });

  it("does nothing for an event with no listeners", async () => {
    const result = await emit("nobody.listening", { factoryId: "fac_1" });
    expect(result).toEqual({ event: "nobody.listening", handled: 0, failed: 0 });
  });

  it("does not deliver an event to another event's listeners", async () => {
    const seen: string[] = [];
    on("appointment.completed", () => void seen.push("completed"));
    await emit("appointment.cancelled", { factoryId: "fac_1" });
    expect(seen).toEqual([]);
  });
});

describe("isolation", () => {
  it("a throwing listener does not stop its siblings, and emit never throws", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const good: string[] = [];

    on("booking.completed", () => {
      throw new Error("billing is down");
    }, "billing.create_draft");
    on("booking.completed", () => void good.push("crm ran"));

    const result = await emit("booking.completed", { factoryId: "fac_1" });

    // The healthy listener still ran; the failure was counted, not propagated.
    expect(good).toEqual(["crm ran"]);
    expect(result).toEqual({ event: "booking.completed", handled: 2, failed: 1 });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("a rejected async listener is counted as failed, not thrown", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    on("booking.completed", async () => {
      throw new Error("async boom");
    });
    const result = await emit("booking.completed", { factoryId: "fac_1" });
    expect(result.failed).toBe(1);
    consoleError.mockRestore();
  });
});

describe("registration lifecycle", () => {
  it("unsubscribe removes only its own listener", async () => {
    const calls: string[] = [];
    const off = on("e", () => void calls.push("a"));
    on("e", () => void calls.push("b"));

    expect(listenerCount("e")).toBe(2);
    off();
    expect(listenerCount("e")).toBe(1);

    await emit("e", { factoryId: "fac_1" });
    expect(calls).toEqual(["b"]);
  });
});
