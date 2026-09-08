import { sharedRateLimit } from "./shared-rate-limit";

export class RateLimitError extends Error {
  readonly code = "E_RATE_LIMIT";
  constructor(readonly retryAfterSeconds: number) {
    super("Too many requests. Please wait a moment and try again.");
  }
}

export async function limitActorRequests(tenantId: string, userId: string, kind: "command" | "query" | "chat") {
  const result = await sharedRateLimit(`${tenantId}:${userId}`, kind);
  if (!result.allowed) throw new RateLimitError(result.retryAfterSeconds);
}

export async function readBoundedJson(request: Request, maxBytes: number): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > maxBytes) throw new Error("body too large");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("body required");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new Error("body too large"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
