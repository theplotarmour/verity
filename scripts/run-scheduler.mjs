import { randomInt, randomUUID } from "node:crypto";
import { nextBoundary } from "./scheduler-time.mjs";

const baseUrl = process.env.VERITY_SCHEDULER_BASE_URL ?? "http://web:3000";
const secret = process.env.CRON_SECRET;
const requestTimeoutMs = Number(process.env.VERITY_SCHEDULER_TIMEOUT_MS ?? "300000");
const maxAttempts = Number(process.env.VERITY_SCHEDULER_MAX_ATTEMPTS ?? "3");

if (!secret || secret.length < 32) {
  console.error(JSON.stringify({ level: "error", message: "scheduler secret is missing or too short" }));
  process.exit(1);
}

const cadences = ["frequent", "hourly", "daily", "weekly"];

function emit(level, message, fields = {}) {
  const safeFields = { ...fields };
  delete safeFields.secret;
  console.log(JSON.stringify({
    service: "verity-scheduler",
    level,
    message,
    timestamp: new Date().toISOString(),
    fields: safeFields,
  }));
}

async function invoke(cadence, attempt, correlationId) {
  const url = new URL("/api/scheduled", baseUrl);
  url.searchParams.set("tenant", "all");
  url.searchParams.set("cadence", cadence);
  url.searchParams.set("attempt", String(attempt));
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret}`,
      "x-correlation-id": correlationId,
    },
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
  const body = await response.text();
  if (response.status === 409) {
    emit("warn", "cadence skipped because another owner holds the lease", { cadence, correlationId });
    return;
  }
  if (!response.ok) throw new Error(`scheduled endpoint returned ${response.status}: ${body.slice(0, 256)}`);
  emit("info", "cadence completed", { cadence, attempt, correlationId });
}

async function runWithRetry(cadence) {
  const correlationId = randomUUID();
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await invoke(cadence, attempt, correlationId);
      return;
    } catch (error) {
      emit(attempt === maxAttempts ? "error" : "warn", "cadence attempt failed", {
        cadence,
        attempt,
        correlationId,
        error: error instanceof Error ? error.message : "unknown scheduler failure",
      });
      if (attempt === maxAttempts) return;
      const backoffMs = Math.min(30_000, 1000 * 2 ** (attempt - 1)) + randomInt(250, 1250);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
}

async function loop(cadence) {
  for (;;) {
    const dueAt = nextBoundary(cadence);
    const delay = Math.max(0, dueAt.getTime() - Date.now());
    emit("info", "cadence scheduled", { cadence, dueAt: dueAt.toISOString() });
    await new Promise((resolve) => setTimeout(resolve, delay));
    await runWithRetry(cadence);
  }
}

emit("info", "scheduler started", { baseUrl, cadences, timezone: "UTC" });
// Establish the first heartbeat promptly. Scheduled contributions are required
// to be idempotent, so a restart-safe immediate frequent pass is preferable to
// making first-install readiness wait for the next clock boundary.
await runWithRetry("frequent");
await Promise.all(cadences.map(loop));
