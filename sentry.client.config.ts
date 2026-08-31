import * as Sentry from "@sentry/nextjs";
import { scrubTelemetryEvent } from "@/server/platform/telemetry-scrub";

/**
 * Sentry — client runtime.
 *
 * Audit findings F-04 and F-06. The previous configuration was `dsn`,
 * `tracesSampleRate: 1`, `debug: false` and nothing else: no scrubbing, so
 * every business detail this codebase deliberately puts into an error message
 * left the deployment intact.
 *
 * Initialises only when a DSN is configured, which is unchanged.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  /**
   * The scrub boundary (F-04).
   *
   * Shares one implementation with the application log rather than having a
   * second: two scrubbers drift, and the one that drifted would be discovered
   * by finding a customer's data in an incident tool.
   *
   * Returning null from here drops an event entirely; the scrubber returns the
   * event, so nothing is silently lost — reports still arrive, with the tenant's
   * business removed from them.
   */
  beforeSend: (event) => scrubTelemetryEvent(event),

  /**
   * Breadcrumbs are scrubbed in `beforeSend` too, but a console breadcrumb is
   * a verbatim copy of a log line and is not worth carrying to a third party
   * when the structured log already holds it, redacted, inside the deployment.
   */
  beforeBreadcrumb: (crumb) => (crumb.category === "console" ? null : crumb),

  /**
   * Was 1 — every transaction traced, in every environment. That is both a
   * volume and an egress decision, and 100% is the wrong default for a system
   * holding other businesses' books.
   *
   * Environment-driven so a deployment can raise it while diagnosing something,
   * without a code change.
   */
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),

  /**
   * Off by default and stated explicitly rather than left to the SDK's default,
   * because the SDK's default is the kind of thing that changes between major
   * versions and this one must not change quietly.
   */
  sendDefaultPii: false,

  debug: false,
});
