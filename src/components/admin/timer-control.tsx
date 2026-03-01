"use client";

import { useState, useEffect } from "react";
import { Clock, Play, Pause } from "lucide-react";
import type { GameStateData } from "@/types";

interface TimerControlProps {
  gameState: GameStateData | null;
}

export function TimerControl({ gameState }: TimerControlProps) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [editing, setEditing] = useState(false);
  const [inputMinutes, setInputMinutes] = useState(20);

  useEffect(() => {
    if (!gameState) return;

    if (!gameState.timerRunning) {
      setRemainingSeconds(gameState.timerSeconds);
      return;
    }

    if (!gameState.timerEndsAt) {
      setRemainingSeconds(gameState.timerSeconds);
      return;
    }

    const endTime = new Date(gameState.timerEndsAt).getTime();

    const tick = () => {
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setRemainingSeconds(remaining);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [gameState]);

  const isRunning = gameState?.timerRunning ?? false;
  const isFrozen = gameState?.gameFrozen ?? false;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const isLow = remainingSeconds <= 60;

  const handleToggleTimer = async () => {
    await fetch("/api/game/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timerRunning: !isRunning }),
    });
  };

  const handleSetTimer = async () => {
    await fetch("/api/game/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timerSeconds: inputMinutes * 60,
        timerRunning: false,
      }),
    });
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-2">
      {editing ? (
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={1}
            max={120}
            value={inputMinutes}
            onChange={(e) => setInputMinutes(parseInt(e.target.value) || 1)}
            className="w-14 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white text-center"
          />
          <span className="text-xs text-gray-500">min</span>
          <button
            onClick={handleSetTimer}
            className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded"
          >
            Set
          </button>
          <button
            onClick={() => setEditing(false)}
            className="text-xs text-gray-500 hover:text-gray-300 px-1"
          >
            X
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={() => setEditing(true)}
            className={`flex items-center gap-1.5 font-mono text-lg font-bold ${
              isLow ? "text-red-400" : "text-white"
            }`}
            title="Click to set timer"
          >
            <Clock className={`h-4 w-4 ${isLow ? "text-red-400" : "text-gray-500"}`} />
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </button>
          {!isFrozen && (
            <button
              onClick={handleToggleTimer}
              className={`p-1.5 rounded-lg transition-all ${
                isRunning
                  ? "bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30"
                  : "bg-green-600/20 text-green-400 hover:bg-green-600/30"
              }`}
              title={isRunning ? "Pause timer" : "Start timer"}
            >
              {isRunning ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}
