import { describe, expect, it } from "vitest";
import { scrubTelemetryEvent, scrubTelemetryText } from "./telemetry-scrub";

/**
 * Audit finding F-04. The point of these is not that the regexes work — it is
 * that the specific things this codebase is known to put into error messages
 * do not reach a third party.
 */
describe("telemetry scrubbing (F-04)", () => {
  it("withholds the body of a business error but keeps its code", () => {
    // The code and the stack say what failed; the interpolated text says which
    // customer and which board, and that is the tenant's business.
    const scrubbed = scrubTelemetryText(
      "E_VALIDATION: no price for Century Club Prime 18mm for this customer, and none given",
    );
    expect(scrubbed).toContain("E_VALIDATION");
    expect(scrubbed).not.toContain("Century Club Prime");
  });

  it("withholds a scope refusal's identifiers", () => {
    const scrubbed = scrubTelemetryText(
      "E_FORBIDDEN: godown 3f7c1a2b-9d4e-4f10-8a5b-2c6d7e8f9a0b is outside this actor's scope for Read verity.plywood.stock_balance",
    );
    expect(scrubbed).not.toContain("3f7c1a2b");
  });

  it("removes a GSTIN, an email address and a phone number", () => {
    const scrubbed = scrubTelemetryText(
      "supplier 07AABCU9603R1ZX contact someone@example.com on +91 9876543210",
    );
    expect(scrubbed).not.toContain("07AABCU9603R1ZX");
    expect(scrubbed).not.toContain("someone@example.com");
    expect(scrubbed).not.toContain("9876543210");
  });

  it("removes credentials from a connection string", () => {
    // /api/ready already strips this shape; an error reaching Sentry instead
    // has taken a different path to the same exposure.
    const scrubbed = scrubTelemetryText(
      "Can't reach database at postgresql://verity_app:s3cr3t@db.example.com:5432/postgres",
    );
    expect(scrubbed).not.toContain("s3cr3t");
  });

  it("drops the request body, cookies and unknown extras from an event", () => {
    const event = scrubTelemetryEvent({
      request: {
        url: "https://app.example.com/customers/3f7c1a2b-9d4e-4f10-8a5b-2c6d7e8f9a0b",
        data: { password: "hunter2" },
        cookies: "sb-access-token=abc",
        headers: { "user-agent": "Mozilla", authorization: "Bearer abc.def.ghi" },
      },
      extra: { customer: "Gupta Timber" },
      user: { id: "u-1", email: "someone@example.com", ip_address: "203.0.113.4" },
    });

    expect(event).not.toBeNull();
    expect(event!.request!.data).toBeUndefined();
    expect(event!.request!.cookies).toBeUndefined();
    expect(event!.extra).toBeUndefined();
    // An allow-list, so a header nobody remembered to deny is still dropped.
    expect(event!.request!.headers).not.toHaveProperty("authorization");
    expect(event!.request!.headers).toHaveProperty("user-agent");
    // The id is kept so reports correlate; the person is not.
    expect(event!.user).toEqual({ id: "u-1" });
    expect(String(event!.request!.url)).not.toContain("3f7c1a2b");
  });

  it("scrubs an exception's message", () => {
    const event = scrubTelemetryEvent({
      exception: {
        values: [{ type: "ValidationError", value: "E_VALIDATION: Gupta Timber is over their limit" }],
      },
    });
    expect(event!.exception!.values![0]!.value).not.toContain("Gupta Timber");
  });

  it("drops breadcrumb data, which has no scrubbable shape", () => {
    const event = scrubTelemetryEvent({
      breadcrumbs: [{ message: "E_FORBIDDEN: role x may not Read y", data: { body: "secret" } }],
    });
    expect(event!.breadcrumbs![0]!.data).toBeUndefined();
  });
});
