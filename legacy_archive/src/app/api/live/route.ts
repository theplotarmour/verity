import { getUserSession } from "@/lib/server/auth";
import { subscribeChange } from "@/lib/server/live-bus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // EventEmitter + long-lived stream need Node, not Edge

// Server-Sent Events stream: pushes a "changed" signal to the browser whenever
// something in the user's factory is mutated, so operational screens can do a
// scoped refresh instead of polling on a blind interval.
export async function GET(request: Request) {
  const session = await getUserSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const factoryId = session.factoryId;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = (line: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(line));
        } catch {
          /* controller already closed */
        }
      };

      // Initial comment opens the stream; retry hint for auto-reconnect.
      send(": connected\n\n");
      send("retry: 5000\n\n");
      // Tell the client who it is, so it can ignore echoes of its own mutations.
      send(`event: hello\ndata: ${session.userId}\n\n`);

      const unsubscribe = subscribeChange(factoryId, (change) => {
        send(`event: change\ndata: ${JSON.stringify(change)}\n\n`);
      });

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        clearTimeout(maxLife);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      // Heartbeat keeps proxies/load-balancers from dropping an idle stream,
      // and doubles as a liveness check: once the client is gone the enqueue
      // throws, which is our only reliable signal on platforms that never fire
      // request.signal abort. Without this the bus listener leaks one entry per
      // reconnect, forever.
      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          cleanup();
        }
      }, 25000);

      // Hard ceiling on a single stream. Serverless platforms kill long-running
      // functions without notice; retiring the stream ourselves guarantees the
      // listener is released and lets EventSource reconnect cleanly.
      const maxLife = setTimeout(cleanup, 5 * 60 * 1000);

      request.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Disable proxy buffering (nginx) so events flush immediately.
      "X-Accel-Buffering": "no",
    },
  });
}
