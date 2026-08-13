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
import { canAccessJobCard } from "@/lib/server/jobCardAccess";

// Walkthrough video for a department stage (e.g. Packing) whose checklist asks
// for one. QC records its clip against the Inspection; a stage card has no
// inspection, so the same signed-upload flow is mirrored here and the clip is
// held by the client until the stage is completed, when it lands on StageEntry.
//
// As with QC the file never passes through a server action: the server validates
// and mints a short-lived signed upload URL, the browser PUTs straight to
// Supabase Storage, and only the resulting path/URL comes back.

export async function createStageVideoUploadUrl(input: {
  jobCardId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const session = await getUserSession();
  if (!session) return { error: "Unauthorized" };

  const jobCard = await prisma.jobCard.findFirst({
    where: { id: input.jobCardId, factoryId: session.factoryId },
    select: { id: true, factoryId: true, departmentId: true, assignedToId: true },
  });
  if (!jobCard) return { error: "Job card not found" };
  if (!(await canAccessJobCard(session, jobCard))) return { error: "Unauthorized" };

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

  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "stage-video.mp4";
  const path = `factory/${session.factoryId}/stage-video/${input.jobCardId}/${Date.now()}-${safeName}`;

  const client = getSupabaseAdminClient();
  const { data, error } = await client.storage.from(STORAGE_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    return { error: `Could not start upload: ${getSupabaseStorageErrorMessage(error)}` };
  }

  return { success: true as const, path: data.path, token: data.token, bucket: STORAGE_BUCKET };
}

/** The public URL for an uploaded stage clip, once the browser PUT succeeded. */
export async function resolveStageVideoUrl(path: string) {
  const session = await getUserSession();
  if (!session) return { error: "Unauthorized" };
  await guardModuleWrite("manufacturing");
  const expectedPrefix = `factory/${session.factoryId}/stage-video/`;
  if (!path.startsWith(expectedPrefix)) return { error: "Invalid upload path" };

  const client = getSupabaseAdminClient();
  const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return { success: true as const, url: data.publicUrl };
}
