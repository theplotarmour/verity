import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("../sentry.server.config");
  if (process.env.NEXT_RUNTIME === "edge") await import("../sentry.edge.config");
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const { captureError, recordExpectedRequestOutcome } = await import("./server/platform/observability");
  if (recordExpectedRequestOutcome(error, {
    route: context.routePath,
    routeType: context.routeType,
    method: request.method,
  })) return;
  if (process.env.NEXT_RUNTIME === "nodejs") {
    captureError(error);
    return;
  }
  const Sentry = await import("@sentry/nextjs");
  await Sentry.captureRequestError(error, request, context);
};
