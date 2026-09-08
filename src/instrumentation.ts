import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("../sentry.server.config");
  if (process.env.NEXT_RUNTIME === "edge") await import("../sentry.edge.config");
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const Sentry = await import("@sentry/nextjs");
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { captureError } = await import("./server/platform/observability");
    captureError(error);
    return;
  }
  await Sentry.captureRequestError(error, request, context);
};
