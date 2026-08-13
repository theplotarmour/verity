import "server-only";

import Groq from "groq-sdk";

/**
 * Groq client and model routing.
 *
 * ponytail: no retry, no interceptors, no streaming wrapper. The SDK already
 * retries and the assistant is request/response. Upgrade path is the SDK's own
 * `maxRetries` option the day a timeout is actually observed.
 */

export const GROQ_MODELS = {
  fast: "llama-3.1-8b-instant",
  analytical: "llama-3.3-70b-versatile",
} as const;

export type TaskType = "operational" | "analytical";

/**
 * Small model for the latency-sensitive path, large for the one worth waiting on.
 *
 * "Where is order 41" must feel instant. "Why did last week's rework double" is a
 * question somebody asked once and will wait four seconds for.
 */
export function routeModel(taskType: TaskType): string {
  return taskType === "analytical" ? GROQ_MODELS.analytical : GROQ_MODELS.fast;
}

/**
 * The client, or a clear configuration error.
 *
 * Checked here rather than left to Groq, because an unset key surfaces from the
 * API as a 401 that reads like a revoked credential — sending whoever is on call
 * to rotate a key that was never set.
 */
export function groqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is not set. The assistant cannot run without it — add it to .env.local."
    );
  }
  return new Groq({ apiKey });
}

export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}
