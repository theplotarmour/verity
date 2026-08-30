import { describe, expect, it } from "vitest";
import { createJob, jobRunner, RetryableJobError, type Job, type JobHandler } from "@/server/platform/job";

/**
 * The background-job contract (Task 29).
 *
 * No production caller exists yet — see job.ts's own module comment and the
 * taskplan for why. These tests exercise the contract directly: creation,
 * execution outcomes (success, permanent failure, retryable failure), and an
 * idempotency demonstration, so the seam is proven correct independent of
 * whichever future dispatcher becomes its first real user.
 */

describe("createJob()", () => {
  it("creates a job with a generated id, the given name/input, and a createdAt", () => {
    const job = createJob("verity.test.example", { a: 1 });
    expect(job.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(job.name).toBe("verity.test.example");
    expect(job.input).toEqual({ a: 1 });
    expect(job.createdAt).toBeInstanceOf(Date);
  });

  it("carries optional metadata through unchanged", () => {
    const job = createJob("verity.test.example", null, { source: "unit-test" });
    expect(job.metadata).toEqual({ source: "unit-test" });
  });

  it("two jobs of the same name get distinct ids", () => {
    const a = createJob("verity.test.example", null);
    const b = createJob("verity.test.example", null);
    expect(a.id).not.toBe(b.id);
  });
});

describe("jobRunner.run(): execution outcomes", () => {
  it("returns success when the handler completes without throwing", async () => {
    const job = createJob("verity.test.ok", { n: 1 });
    const handler: JobHandler<{ n: number }> = async () => {};

    expect(await jobRunner.run(job, handler)).toEqual({ status: "success" });
  });

  it("passes the job to the handler", async () => {
    const job = createJob("verity.test.receives-job", { n: 42 });
    let received: Job<{ n: number }> | null = null;
    const handler: JobHandler<{ n: number }> = async (j) => {
      received = j;
    };

    await jobRunner.run(job, handler);
    expect(received).toEqual(job);
  });

  it("classifies a plain thrown error as a permanent (non-retryable) failure", async () => {
    const job = createJob("verity.test.bad-input", { n: -1 });
    const handler: JobHandler<{ n: number }> = async () => {
      throw new Error("E_VALIDATION: n must be positive");
    };

    expect(await jobRunner.run(job, handler)).toEqual({
      status: "failed",
      retryable: false,
      error: "E_VALIDATION: n must be positive",
    });
  });

  it("classifies a RetryableJobError as a retryable failure", async () => {
    const job = createJob("verity.test.transient", { n: 1 });
    const handler: JobHandler<{ n: number }> = async () => {
      throw new RetryableJobError("downstream service unreachable");
    };

    expect(await jobRunner.run(job, handler)).toEqual({
      status: "failed",
      retryable: true,
      error: "downstream service unreachable",
    });
  });

  it("classifies a non-Error throw (e.g. a string) as permanent, with a stringified message", async () => {
    const job = createJob("verity.test.weird-throw", null);
    const handler: JobHandler<unknown> = async () => {
      throw "not an Error instance";
    };

    expect(await jobRunner.run(job, handler)).toEqual({
      status: "failed",
      retryable: false,
      error: "not an Error instance",
    });
  });
});

describe("jobRunner.run(): idempotency demonstration", () => {
  it("a handler that guards on a unique key produces no duplicate effect when run twice", async () => {
    // Stands in for "sending a notification twice may be bad" (Phase D):
    // the handler itself is what decides idempotency — the runner has no
    // universal exactly-once guarantee to offer, by design (Phase D/E).
    const delivered = new Set<string>();
    let sideEffects = 0;

    const handler: JobHandler<{ notificationId: string }> = async (job) => {
      if (delivered.has(job.input.notificationId)) return; // already sent — no-op
      delivered.add(job.input.notificationId);
      sideEffects++;
    };

    const job = createJob("verity.notification.deliver", { notificationId: "n-1" });
    await jobRunner.run(job, handler);
    await jobRunner.run(job, handler); // simulates a retry of the same job

    expect(sideEffects).toBe(1);
  });

  it("a handler with no such guard DOES duplicate its effect when run twice — the runner does not prevent this", async () => {
    // Demonstrates the negative: nothing here manufactures a universal
    // exactly-once guarantee (Phase D explicitly forbids inventing one). A
    // handler for a non-idempotent operation (e.g. a financial mutation)
    // must build its own guard, the way notification.ts's real design already
    // does via markSent()'s `where: { status: "Pending" }` conditional update.
    let count = 0;
    const handler: JobHandler<null> = async () => {
      count++;
    };

    const job = createJob("verity.test.non-idempotent", null);
    await jobRunner.run(job, handler);
    await jobRunner.run(job, handler);

    expect(count).toBe(2);
  });
});

describe("boundary: no infrastructure-specific type leaks into the contract", () => {
  it("Job/JobOutcome carry only Verity-defined fields", async () => {
    const job = createJob("verity.test.shape", { x: 1 });
    expect(Object.keys(job).sort()).toEqual(["createdAt", "id", "input", "metadata", "name"]);

    const outcome = await jobRunner.run(job, async () => {});
    expect(Object.keys(outcome).sort()).toEqual(["status"]);
  });

  it("jobRunner exposes only `name` and `run` — no queue/connection/client details", () => {
    expect(Object.keys(jobRunner).sort()).toEqual(["name"]);
    expect(typeof jobRunner.run).toBe("function");
  });
});
