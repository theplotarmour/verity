import "server-only";

import prisma from "@/lib/prisma";
import { on, type EventListener } from "./bus";

/**
 * Where modules wire their reactions to other modules' events.
 *
 * This is the one file that knows about both sides of a composition, on purpose:
 * the publisher (`booking`) and the reactor (`core`'s activity trail) stay
 * ignorant of each other, and the edge between them lives here where it can be
 * read in one place. Add a workflow — `booking.completed → billing.create_draft`
 * — by registering it here, touching neither module.
 *
 * Idempotent: `registerReactions` is safe to call from every action that emits,
 * so registration never depends on a particular import running first.
 */

let registered = false;

export function registerReactions(): void {
  if (registered) return;
  registered = true;

  // Core records booking lifecycle milestones to the activity trail. The booking
  // action does not import audit or know this happens — it just publishes.
  on("appointment.confirmed", auditAppointment("confirmed"), "core.audit_appointment");
  on("appointment.completed", auditAppointment("completed"), "core.audit_appointment");
  on("appointment.cancelled", auditAppointment("cancelled"), "core.audit_appointment");
}

function auditAppointment(kind: string): EventListener {
  return async (payload) => {
    await prisma.auditLog.create({
      data: {
        factoryId: String(payload.factoryId),
        action: `Appointment ${kind}: ${String(payload.customerName ?? "")}`,
        entityType: "Appointment",
        entityId: String(payload.appointmentId ?? ""),
      },
    });
  };
}
