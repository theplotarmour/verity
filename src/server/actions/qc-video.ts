"use server";

import { guardModuleAction, guardModuleWrite } from "@/platform/modules/guard";

import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/server/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseStorageErrorMessage } from "@/lib/supabase/admin-errors";
import {
  STORAGE_BUCKET,
  VIDEO_ALLOWED_EXTENSIONS,
  VIDEO_ALLOWED_MIME_TYPES,
  VIDEO_MAX_BYTES,
} from "@/lib/storage/config";
import { revalidatePath } from "next/cache";

// QC walkthrough video — any length.
//
// The file never passes through a server action: a phone clip would exceed the
// action body limit and base64 would inflate it by a third. Instead the server
// validates the request and mints a short-lived signed upload URL, the browser
// PUTs the file straight to Supabase Storage, then calls attachQcVideo to
// record it against the inspection.

function canCaptureQc(role: string) {
  return ["WORKER", "SUPERVISOR", "OWNER", "CO_OWNER", "MANAGER"].includes(role);
}

/**
 * Validates the clip and returns a one-time signed upload target.
 * Duration is measured in the browser (the server cannot read the file yet),
 * so it is re-asserted on attach.
 */
export async function createQcVideoUploadUrl(input: {
  inspectionId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  durationSec: number;
}) {
  const session = await getUserSession();
  if (!session || !canCaptureQc(session.role)) return { error: "Unauthorized" };

  const inspection = await prisma.inspection.findFirst({
    where: { id: input.inspectionId, factoryId: session.factoryId },
    select: { id: true, status: true },
  });
  if (!inspection) return { error: "Inspection not found" };
  if (inspection.status === "APPROVED") {
    return { error: "This inspection is already approved — its video is locked" };
  }

  if (!VIDEO_ALLOWED_MIME_TYPES.has(input.mimeType)) {
    return { error: `Unsupported video type: ${input.mimeType}. Use MP4, MOV or WebM.` };
  }
  const ext = input.fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext && !VIDEO_ALLOWED_EXTENSIONS.has(ext)) {
    return { error: `Unsupported video extension: .${ext}` };
  }
  if (input.sizeBytes > VIDEO_MAX_BYTES) {
    return { error: `Video is too large (max ${Math.round(VIDEO_MAX_BYTES / 1024 / 1024)} MB). Try recording at a lower quality.` };
  }

  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "qc-video.mp4";
  const path = `factory/${session.factoryId}/qc-video/${input.inspectionId}/${Date.now()}-${safeName}`;

  const client = getSupabaseAdminClient();
  const { data, error } = await client.storage.from(STORAGE_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    return { error: `Could not start upload: ${getSupabaseStorageErrorMessage(error)}` };
  }

  return { success: true, path: data.path, token: data.token, bucket: STORAGE_BUCKET };
}

/** Records an uploaded clip against the inspection. */
export async function attachQcVideo(input: {
  inspectionId: string;
  path: string;
  durationSec: number;
}) {
  const session = await getUserSession();
  if (!session || !canCaptureQc(session.role)) return { error: "Unauthorized" };

  const inspection = await prisma.inspection.findFirst({
    where: { id: input.inspectionId, factoryId: session.factoryId },
    select: { id: true, jobCard: { select: { workOrderId: true } } },
  });
  if (!inspection) return { error: "Inspection not found" };

  const duration = Math.max(0, Math.round(input.durationSec || 0));
  // Only accept paths we minted for this factory + inspection.
  const expectedPrefix = `factory/${session.factoryId}/qc-video/${input.inspectionId}/`;
  if (!input.path.startsWith(expectedPrefix)) return { error: "Invalid upload path" };

  const client = getSupabaseAdminClient();
  const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(input.path);

  await prisma.inspection.update({
    where: { id: inspection.id },
    data: {
      videoUrl: data.publicUrl,
      videoPath: input.path,
      videoDurationSec: duration,
      videoUploadedAt: new Date(),
      videoUploadedById: session.userId,
    },
  });

  await prisma.auditLog.create({
    data: {
      factoryId: session.factoryId,
      actorUserId: session.userId,
      action: `QC walkthrough video attached (${duration}s)`,
      entityType: "Inspection",
      entityId: inspection.id,
    },
  });

  revalidatePath("/owner/qc-floor");
  revalidatePath(`/owner/review/${inspection.id}`);
  revalidatePath(`/inspector/review/${inspection.id}`);
  revalidatePath("/worker");
  return { success: true, videoUrl: data.publicUrl, durationSec: duration };
}

/** Removes the clip (before approval) so it can be recaptured. */
export async function removeQcVideo(inspectionId: string) {
  const session = await getUserSession();
  if (!session || !canCaptureQc(session.role)) return { error: "Unauthorized" };
  await guardModuleWrite("quality");

  const inspection = await prisma.inspection.findFirst({
    where: { id: inspectionId, factoryId: session.factoryId },
    select: { id: true, status: true, videoPath: true },
  });
  if (!inspection) return { error: "Inspection not found" };
  if (inspection.status === "APPROVED") return { error: "Approved inspections keep their video" };

  if (inspection.videoPath) {
    try {
      await getSupabaseAdminClient().storage.from(STORAGE_BUCKET).remove([inspection.videoPath]);
    } catch {
      // The record is what matters; a stray object can be swept later.
    }
  }
  await prisma.inspection.update({
    where: { id: inspection.id },
    data: { videoUrl: null, videoPath: null, videoDurationSec: null, videoUploadedAt: null, videoUploadedById: null },
  });

  revalidatePath(`/owner/review/${inspection.id}`);
  revalidatePath("/worker");
  return { success: true };
}
