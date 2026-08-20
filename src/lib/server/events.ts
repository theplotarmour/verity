import "server-only";

import prisma from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";
import { publishChange } from "@/lib/server/live-bus";

// Canonical internal event matrix (portals are out of scope, so all internal).
export const EVENTS = {
  ORDER_CREATED: "ORDER_CREATED",
  STAGE_COMPLETED: "STAGE_COMPLETED",
  QC_REJECTED: "QC_REJECTED",
  // A submitted audit that scored below the pass threshold. Distinct from
  // QC_REJECTED: nobody has rejected it, which is exactly the problem — the batch
  // is sitting in the queue with a third of its checkpoints failed and only the
  // department's own supervisor has been told it arrived.
  QC_SCORE_LOW: "QC_SCORE_LOW",
  // A worker stopped a stage: broken machine, missing material, a delay they
  // cannot absorb. The line is idle from this moment, so it is a supervisor's
  // problem within minutes, not at the end of the shift.
  STAGE_HELD: "STAGE_HELD",
  // Food is cooked and under the lamp. Nobody on the floor is watching the kitchen
  // screen, so the pass has to be told rather than noticing.
  ORDER_READY: "ORDER_READY",
  REWORK_ASSIGNED: "REWORK_ASSIGNED",
  DISPATCH_COMPLETED: "DISPATCH_COMPLETED",
  LOW_STOCK: "LOW_STOCK",
  PO_APPROVED: "PO_APPROVED",
  PO_RECEIVED: "PO_RECEIVED",
  // --- Composed workflow milestones -----------------------------------------
  // Raised by event *reactions* rather than by the action that did the work. A
  // ticket arriving, a job being dispatched, a visit finishing and an
  // appointment being served are the points where one module's work becomes
  // another's queue, and the person who has to act on that is not the person
  // who caused it.
  TICKET_CREATED: "TICKET_CREATED",
  WORK_ORDER_DISPATCHED: "WORK_ORDER_DISPATCHED",
  WORK_ORDER_COMPLETED: "WORK_ORDER_COMPLETED",
  APPOINTMENT_COMPLETED: "APPOINTMENT_COMPLETED",
} as const;
export type EventKey = keyof typeof EVENTS;

// The two highest-value events also go out over WhatsApp when configured.
const WHATSAPP_EVENTS = new Set<string>([EVENTS.QC_REJECTED, EVENTS.DISPATCH_COMPLETED]);

type Prefs = { email?: boolean; whatsapp?: boolean };

// Single funnel for every internal event: always writes an in-app notification,
// then fans out to email / WhatsApp per recipient preference when the channel is
// configured. Channel adapters no-op (and log) when their env keys are absent, so
// this is always safe to call.
export async function emitEvent(params: {
  factoryId: string;
  event: EventKey;
  recipients: string[]; // user ids
  title: string;
  message: string;
  linkUrl?: string;
  type?: NotificationType;
  actorId?: string; // who caused it — their own tab skips the live-refresh echo
}) {
  const { factoryId, event, title, message, linkUrl } = params;
  const recipients = Array.from(new Set(params.recipients.filter(Boolean)));
  if (recipients.length === 0) return { delivered: 0 };
  const type = params.type ?? "INFO";

  const users = await prisma.user.findMany({
    where: { id: { in: recipients }, factoryId, isActive: true },
    select: { id: true, name: true, email: true, phone: true, notificationPrefs: true },
  });

  // In-app for everyone (always on).
  await prisma.notification.createMany({
    data: users.map((u) => ({ factoryId, userId: u.id, title, message, type, linkUrl })),
  });

  // Nudge every connected client in this factory to refresh (SSE live update).
  publishChange(factoryId, EVENTS[event], params.actorId);

  for (const u of users) {
    const prefs = (u.notificationPrefs as Prefs | null) ?? {};
    if (prefs.email && u.email) await sendEmail(u.email, title, message, linkUrl).catch((e) => console.error("email send failed", e));
    if (prefs.whatsapp && u.phone && WHATSAPP_EVENTS.has(EVENTS[event])) {
      await sendWhatsApp(u.phone, `${title}\n\n${message}`).catch((e) => console.error("whatsapp send failed", e));
    }
  }

  return { delivered: users.length };
}

// ---- Channel adapters (dependency-free; no-op without config) ----

async function sendEmail(to: string, subject: string, body: string, linkUrl?: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_EMAIL_FROM;
  if (!key || !from) {
    console.log(`[email skipped — RESEND_API_KEY/NOTIFY_EMAIL_FROM unset] to=${to} subject=${subject}`);
    return;
  }
  const html = `<p>${escapeHtml(body)}</p>${linkUrl ? `<p><a href="${linkUrl}">Open in Verity</a></p>` : ""}`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

async function sendWhatsApp(phone: string, text: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) {
    console.log(`[whatsapp skipped — WHATSAPP_TOKEN/WHATSAPP_PHONE_ID unset] to=${phone}`);
    return;
  }
  const digits = phone.replace(/\D/g, "");
  const to = digits.length === 10 ? `91${digits}` : digits; // default to India country code
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } }),
  });
  if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${await res.text()}`);
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Convenience: all owner-side users (owner/co-owner/manager) for a factory.
export async function ownerRecipients(factoryId: string) {
  const rows = await prisma.user.findMany({
    where: { factoryId, role: { in: ["OWNER", "CO_OWNER", "MANAGER"] }, isActive: true },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/**
 * Every active supervisor in the factory.
 *
 * Deliberately not filtered by department, unlike the "ready for QC" nudge in
 * `submitStageWork`: a routine queue item belongs to the department that owns it,
 * but a stopped machine or a failing audit is a floor-wide problem and the
 * supervisor who can act on it is often not the one whose queue it landed in.
 *
 * `isActive` matters — a departed supervisor's unread pile is where alerts go to
 * die.
 */
export async function supervisorRecipients(factoryId: string) {
  const rows = await prisma.user.findMany({
    where: { factoryId, role: "SUPERVISOR", isActive: true },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}
