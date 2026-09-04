import "server-only";
import { ForbiddenError } from "@/server/platform/authorization";

/**
 * Named per-panel state — Task 86.
 *
 * A page built from several independent queries (a dashboard, an Overview
 * page) must not let one query's failure blank the whole page. The prior
 * pattern on `/overview` caught `ForbiddenError` per query (denied → empty/
 * null) but let any OTHER error — a real database failure, a timeout —
 * propagate and crash the entire page, which is exactly the "Degraded"
 * state Task 86 asks for and the page didn't actually have. This is the
 * fix: every panel-level fetch gets a real state, not just a happy path
 * and a permission path.
 *
 * `"ok" | "denied" | "error"` rather than a boolean "loading/error/data" —
 * a denied panel and a broken panel look different to a reader (denied:
 * nothing to see here, expected; error: something is actually wrong,
 * worth a retry) and should render differently.
 */
export type PanelState<T> =
  | { status: "ok"; data: T }
  | { status: "denied" }
  | { status: "error"; message: string };

/**
 * Awaits `promise`, turning a `ForbiddenError` into `denied` and any other
 * thrown error into `error` rather than letting either propagate. Never
 * throws — a caller building a dashboard from several of these can await
 * them together (`Promise.all`) without one failure taking the others down,
 * because nothing here rejects.
 */
export async function loadPanel<T>(promise: Promise<T>): Promise<PanelState<T>> {
  try {
    return { status: "ok", data: await promise };
  } catch (error) {
    if (error instanceof ForbiddenError) return { status: "denied" };
    return { status: "error", message: error instanceof Error ? error.message : String(error) };
  }
}
