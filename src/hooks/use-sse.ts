"use client";

import { useEffect, useRef, useCallback } from "react";

type SSEHandler = (data: unknown) => void;

export function useSSE(handlers: Record<string, SSEHandler>) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource("/api/events/stream");
    eventSourceRef.current = es;

    es.onopen = () => {
      console.log("[SSE] Connected");
    };

    es.onerror = () => {
      console.log("[SSE] Error, reconnecting in 3s...");
      es.close();
      setTimeout(connect, 3000);
    };

    // Listen for each event type
    const eventTypes = [
      "team-update",
      "order-update",
      "trade-complete",
      "event-log",
      "game-state-update",
      "game-reset",
      "roles-rotated",
      "embargo-imposed",
      "espionage-result",
      "strike-started",
      "revolution",
      "tariff-imposed",
      "resource-synthesized",
      "fdi-proposal",
      "fdi-vote-result",
    ];

    for (const eventType of eventTypes) {
      es.addEventListener(eventType, (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          const handler = handlersRef.current[eventType];
          if (handler) {
            handler(data);
          }
        } catch (err) {
          console.error(`[SSE] Failed to parse ${eventType}:`, err);
        }
      });
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connect]);
}
