"use client";

import { useState, useCallback, useRef } from "react";

export function useCooldown(cooldownMs: number) {
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const trigger = useCallback(() => {
    setIsOnCooldown(true);
    setRemainingMs(cooldownMs);

    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const startTime = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, cooldownMs - elapsed);
      setRemainingMs(remaining);

      if (remaining <= 0) {
        setIsOnCooldown(false);
        setRemainingMs(0);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    }, 100);
  }, [cooldownMs]);

  const progress = cooldownMs > 0 ? 1 - remainingMs / cooldownMs : 1;

  return { isOnCooldown, remainingMs, progress, trigger };
}
