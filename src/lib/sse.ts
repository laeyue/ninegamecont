// Server-side SSE event broadcaster
// Uses a simple EventEmitter pattern for in-process broadcasting

type SSEListener = (event: string, data: string) => void;

class SSEBroadcaster {
  private listeners: Set<SSEListener> = new Set();

  subscribe(listener: SSEListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: string, data: unknown): void {
    const serialized = JSON.stringify(data);
    Array.from(this.listeners).forEach((listener) => {
      try {
        listener(event, serialized);
      } catch {
        // Listener may have been cleaned up
      }
    });
  }

  get connectionCount(): number {
    return this.listeners.size;
  }
}

// Singleton — survives hot reloads in dev
const globalForSSE = globalThis as unknown as {
  sseBroadcaster: SSEBroadcaster | undefined;
};

export const sseBroadcaster =
  globalForSSE.sseBroadcaster ?? new SSEBroadcaster();

if (process.env.NODE_ENV !== "production") {
  globalForSSE.sseBroadcaster = sseBroadcaster;
}

// ---------- SSE Event Names ----------
export const SSE_EVENTS = {
  TEAM_UPDATE: "team-update",
  ORDER_UPDATE: "order-update",
  TRADE_COMPLETE: "trade-complete",
  EVENT_LOG: "event-log",
  GAME_STATE_UPDATE: "game-state-update",
  GAME_RESET: "game-reset",
  ROLES_ROTATED: "roles-rotated",
  EMBARGO_IMPOSED: "embargo-imposed",
  ESPIONAGE_RESULT: "espionage-result",
  STRIKE_STARTED: "strike-started",
  REVOLUTION: "revolution",
} as const;
