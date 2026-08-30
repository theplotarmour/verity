import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { registerStorageDriver, type StorageDriver } from "@/server/platform/files";
import { runtimeConfig } from "@/server/platform/config";

/**
 * The storage binding.
 *
 * Authority: EXISTING INFRASTRUCTURE. Supabase already holds authentication and
 * the database; its Storage is the same project, the same credentials and the
 * same region, so binding it adds no vendor and no bill that this deployment was
 * not already carrying.
 *
 * WHY NOW
 * `files.ts` recorded the contract with no provider and said so in writing:
 * binding one is a deployment step, and a contract with no provider is a
 * decision that has been made. The plywood client is the first requirement that
 * genuinely needs bytes to persist — LR scans and signed delivery receipts are
 * `Evidence`, and Evidence without a file is a row claiming a photograph exists.
 * That makes the binding legitimate rather than a guess.
 *
 * WHY IT LIVES OUTSIDE `src/server/platform/`
 * The platform owns the record of a file and delegates the bytes. A concrete
 * backend is a deployment fact, not a platform contract, so it registers through
 * the extension point exactly as a capability registers a command. Nothing in
 * `src/server/platform/` changes to add, replace or remove it.
 *
 * WHAT IT DOES NOT DO
 * It does not decide who may read a file. Authorization happens before
 * `readUrlFor` is called; this driver only mints a short-lived URL for a key it
 * is handed. Keeping that separation is why the platform holds the record.
 */

let client: SupabaseClient | null = null;
let installed = false;

function serviceClient(url: string, key: string): SupabaseClient {
  client ??= createClient(url, key, {
    auth: {
      // A server-side service client, not a user session. Persisting or
      // refreshing a session here would put a service-role token into whatever
      // storage the SDK reaches for, which on a server is a shared process.
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return client;
}

/**
 * Supabase Storage as a `StorageDriver`.
 *
 * Signed URLs throughout. The service-role key never leaves the server, and the
 * browser is handed a URL scoped to one object for a few minutes — so bytes go
 * directly between the client and Supabase without transiting the application,
 * which is the shape `reserveUpload` was written for.
 */
export function supabaseStorageDriver(input: {
  url: string;
  serviceRoleKey: string;
  bucket: string;
}): StorageDriver {
  const supabase = serviceClient(input.url, input.serviceRoleKey);

  return {
    name: `supabase:${input.bucket}`,

    async createUploadUrl(key, mimeType) {
      const { data, error } = await supabase.storage
        .from(input.bucket)
        .createSignedUploadUrl(key);
      if (error || !data) {
        throw new Error(`E_STORAGE: could not create an upload URL (${error?.message ?? "no data"})`);
      }
      return {
        url: data.signedUrl,
        // Sent so the object is stored with the type the caller declared. The
        // platform re-checks size and checksum on confirmation regardless — a
        // client-declared content type is a convenience, never a control.
        headers: { "content-type": mimeType },
      };
    },

    async createReadUrl(key, expiresInSeconds) {
      const { data, error } = await supabase.storage
        .from(input.bucket)
        .createSignedUrl(key, expiresInSeconds);
      if (error || !data) {
        throw new Error(`E_STORAGE: could not create a read URL (${error?.message ?? "no data"})`);
      }
      return data.signedUrl;
    },

    async delete(key) {
      const { error } = await supabase.storage.from(input.bucket).remove([key]);
      if (error) throw new Error(`E_STORAGE: could not delete the object (${error.message})`);
    },
  };
}

/**
 * Binds a storage backend if this deployment has one configured.
 *
 * Silent when the variables are absent, and deliberately so: a deployment
 * without storage is a valid deployment. `files.ts` already refuses with
 * `E_STORAGE_UNAVAILABLE` at the point of use, which names the actual problem —
 * failing at boot instead would take down sign-in over a feature nobody on that
 * deployment had reached for yet.
 */
export function installStorage(): void {
  if (installed) return;

  const url = runtimeConfig.storage.supabaseUrl;
  const serviceRoleKey = runtimeConfig.storage.serviceRoleKey;
  const bucket = runtimeConfig.storage.bucket;

  if (!url || !serviceRoleKey || !bucket) return;

  installed = true;
  registerStorageDriver(supabaseStorageDriver({ url, serviceRoleKey, bucket }));
}
