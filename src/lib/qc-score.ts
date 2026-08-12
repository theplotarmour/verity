/**
 * Scoring a QC audit.
 *
 * Pure and framework-free, so the threshold is one number in one place: the
 * server action that alerts on it, and any surface that wants to show the same
 * score, read it from here. It also cannot live in `qc.ts` — that is a
 * `"use server"` module, and only async functions may be exported from one.
 */

/**
 * The pass mark for a QC audit, as a percentage of its pass/fail checkpoints.
 *
 * A single failed checkpoint is ordinary — that is what rework is for, and the
 * inspector already decides it. This threshold is about the other case: an audit
 * that comes back mostly failed, which is a process problem rather than a piece
 * problem, and which nobody senior currently hears about until they open it.
 */
export const QC_FAIL_THRESHOLD = 70;

export type QcScore = { score: number; passed: number; failed: number };

/**
 * An audit's score: the share of its pass/fail checkpoints that passed.
 *
 * Returns null when the audit has no pass/fail checkpoints at all. A template of
 * pure measurements and text answers has no score, and reporting that as 0% would
 * page the owner about every one of them.
 *
 * Unanswered checkpoints (`passFail` null) are excluded rather than counted as
 * failures — a half-finished audit is not a failing one.
 */
export function qcAuditScore(submissions: Array<{ passFail?: string | null }>): QcScore | null {
  const passed = submissions.filter((s) => s.passFail === "PASS").length;
  const failed = submissions.filter((s) => s.passFail === "FAIL").length;
  const graded = passed + failed;
  if (graded === 0) return null;
  return { score: Math.round((passed / graded) * 100), passed, failed };
}

/** Whether a score is bad enough to alert on. Null scores never alert. */
export function isFailingQcScore(result: QcScore | null): result is QcScore {
  return result !== null && result.score < QC_FAIL_THRESHOLD;
}
