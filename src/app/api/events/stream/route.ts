import { sseBroadcaster } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ connected: true })}\n\n`)
      );

      // Keep-alive heartbeat every 30s
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Subscribe to SSE events
      unsubscribe = sseBroadcaster.subscribe((event, data) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
        } catch {
          // Client disconnected
          unsubscribe?.();
          clearInterval(heartbeat);
        }
      });
    },
    cancel() {
      unsubscribe?.();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
