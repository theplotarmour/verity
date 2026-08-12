import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { QC_FAIL_THRESHOLD, isFailingQcScore, qcAuditScore } from "./qc-score";

/**
 * The QC audit score and the alert it triggers.
 *
 * An inspector's explicit rejection already reaches owners — `rejectInspection`
 * emits QC_REJECTED. The gap this closes is the audit nobody has rejected yet: it
 * sits in the queue with most of its checkpoints failed, and the only person told
 * is the department supervisor whose queue it landed in, in a message that says
 * "waiting for your review" and nothing about the score.
 */
describe("qcAuditScore", () => {
  it("scores the share of graded checkpoints that passed", () => {
    const result = qcAuditScore([
      { passFail: "PASS" },
      { passFail: "PASS" },
      { passFail: "PASS" },
      { passFail: "FAIL" },
    ]);
    expect(result).toEqual({ score: 75, passed: 3, failed: 1 });
  });

  it("has no score when nothing is pass/fail", () => {
    // A template of measurements and free text. Scoring it 0% would page the
    // owner about every single one.
    expect(qcAuditScore([{ passFail: null }, { passFail: null }])).toBeNull();
    expect(qcAuditScore([])).toBeNull();
  });

  it("ignores unanswered checkpoints rather than counting them as failures", () => {
    // A half-finished audit is not a failing audit.
    const result = qcAuditScore([{ passFail: "PASS" }, { passFail: null }, { passFail: null }]);
    expect(result).toEqual({ score: 100, passed: 1, failed: 0 });
  });

  it("reads a total failure as 0 and a clean sheet as 100", () => {
    expect(qcAuditScore([{ passFail: "FAIL" }])?.score).toBe(0);
    expect(qcAuditScore([{ passFail: "PASS" }])?.score).toBe(100);
  });
});

describe("isFailingQcScore", () => {
  it("fails below the threshold and passes at it", () => {
    // Exactly at the pass mark is a pass — the alert is for what falls short.
    expect(isFailingQcScore({ score: QC_FAIL_THRESHOLD - 1, passed: 0, failed: 0 })).toBe(true);
    expect(isFailingQcScore({ score: QC_FAIL_THRESHOLD, passed: 0, failed: 0 })).toBe(false);
  });

  it("never fires on an unscored audit", () => {
    expect(isFailingQcScore(null)).toBe(false);
  });

  it("treats one failed checkpoint out of many as ordinary", () => {
    // The reason there is a threshold at all: rework already handles a single
    // defect, and alerting the owner on each would train them to ignore it.
    expect(isFailingQcScore(qcAuditScore(Array(10).fill({ passFail: "PASS" }).concat([{ passFail: "FAIL" }])))).toBe(false);
  });
});

describe("the alert action", () => {
  const source = readFileSync(
    path.resolve(__dirname, "../server/actions/qc.ts"),
    "utf8"
  );
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "");

  it("derives factoryId from the session, never from an argument", () => {
    // `qc.ts` is a "use server" module, so every export is a public POST
    // endpoint. A tenant id taken from the payload would let anyone push
    // notifications into any workspace.
    expect(code).toMatch(/getActiveSessionUser\(\)/);
    expect(code).toMatch(/const \{ factoryId \} = session/);
    expect(code).not.toMatch(/reportQcAuditScore\([^)]*factoryId/);
  });

  it("scopes the inspection read by factory", () => {
    expect(code).toMatch(/inspection\.findFirst\(\{\s*where: \{ id: inspectionId, factoryId \}/);
  });

  it("notifies owners and every supervisor", () => {
    expect(code).toMatch(/ownerRecipients\(factoryId\)/);
    expect(code).toMatch(/supervisorRecipients\(factoryId\)/);
  });

  it("does not notify the person who submitted it", () => {
    // They know. It is their audit.
    expect(code).toMatch(/filter\(\(id\) => id !== session\.id\)/);
  });

  it("swallows its own failures", () => {
    // The audit is already committed by the time this runs. A failed fan-out
    // must not surface as a failed submission.
    expect(code).toMatch(/catch \(error\)[\s\S]*QC audit score alert failed/);
  });

  it("still scopes passQC by factory", () => {
    // Found while adding the trigger: the old code read the job card by id
    // alone, so a guessed id reached another tenant's card.
    const pass = code.slice(code.indexOf("export async function passQC"));
    expect(pass).toMatch(/jobCard\.findFirst\(\{\s*where: \{ id: jobCardId, factoryId: owner\.factoryId \}/);
  });
});

describe("the trigger is actually wired", () => {
  it("fires from the live QC submission, after the transaction", () => {
    // `passQC` in the same file has no call sites at all — putting the trigger
    // only there would have delivered nothing. The live path is the worker
    // submitting their checklist, which is what moves a card to QC_PENDING.
    const worker = readFileSync(
      path.resolve(__dirname, "../server/actions/worker.ts"),
      "utf8"
    );
    const submit = worker.slice(worker.indexOf("export async function submitCheckpoints"));
    expect(submit).toMatch(/reportQcAuditScore/);
    // After the commit: the call must sit outside the $transaction callback.
    const txEnd = submit.indexOf("{ timeout: 30000, maxWait: 10000 })");
    expect(txEnd).toBeGreaterThan(-1);
    expect(submit.indexOf("reportQcAuditScore")).toBeGreaterThan(txEnd);
  });
});
