"use server";

import { uploadStorageImage as uploadStorageImageImpl, type StorageUploadInput } from "@/lib/storage/upload";
import { getActiveSessionUser } from "@/lib/server/session-user";

/**
 * Image upload, for the browser.
 *
 * Every export of a `"use server"` module is a public POST endpoint. This one
 * writes to a bucket that is deliberately public — the app stores
 * `getPublicUrl()` links — so without a session check anyone who could reach
 * the app could write arbitrary files to your storage and get a durable public
 * URL back, on your domain and your bill.
 *
 * Two guards, because either alone is insufficient:
 *
 *  1. a valid session, so it is not open to the internet;
 *  2. the object key is rewritten under the caller's own factory, so one tenant
 *     cannot overwrite another's evidence by passing its path. `upsert: true`
 *     means a chosen path is a write to *someone's* existing object.
 */
export async function uploadStorageImage(input: StorageUploadInput) {
  // Confirmed against the database rather than read off the cookie: a JWT keeps
  // asserting what was true when it was minted, so a deleted or deactivated
  // user could otherwise keep writing to public storage until it expired.
  const session = await getActiveSessionUser();
  if (!session) throw new Error("Sign in to upload.");

  // Strip any leading tenant segment the client may have supplied, then anchor
  // the path under the session's own factory. Traversal segments go with it.
  const requested = input.path.replace(/^\/+/, "").replace(/\.\.+/g, "");
  const withoutTenant = requested.replace(/^factories\/[^/]+\//, "");
  const path = `factories/${session.factoryId}/${withoutTenant}`;

  return uploadStorageImageImpl({ ...input, path });
}
