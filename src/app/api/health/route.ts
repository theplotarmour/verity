import { NextResponse } from "next/server";
import { version } from "../../../../package.json";

/**
 * Liveness — "the process is alive and responding."
 *
 * Authority: taskplans/32_health_readiness.md.
 *
 * Deliberately does NOTHING beyond reading a constant. No database, no
 * storage, no external call — the whole point of a liveness probe is that
 * it answers "is this process able to respond at all," a question a
 * dependency outage must not be able to answer "no" to. Readiness (can this
 * instance actually serve traffic) is `/api/ready`'s job, not this one's —
 * conflating the two is exactly what turns a database blip into every
 * container being killed and restarted by an orchestrator that read the
 * wrong signal.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ status: "ok", version });
}
