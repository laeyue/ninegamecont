"use client";

import { useState } from "react";
import { OctagonX, RotateCcw, Loader2 } from "lucide-react";
import type { GameStateData } from "@/types";

interface GameControlProps {
  gameState: GameStateData | null;
  onReset: () => void;
}

export function GameControl({ gameState, onReset }: GameControlProps) {
  const isFrozen = gameState?.gameFrozen ?? false;
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleEndGame = async () => {
    setLoading("end");
    await fetch("/api/game/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameFrozen: !isFrozen }),
    });
    setLoading(null);
  };

  const handleReset = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
      return;
    }

    setLoading("reset");
    setConfirmReset(false);
    await fetch("/api/game/reset", { method: "POST" });
    onReset();
    setLoading(null);
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
      <h2 className="text-sm font-bold mb-3">Game Controls</h2>

      <div className="space-y-2">
        {/* End / Resume Game */}
        <button
          onClick={handleEndGame}
          disabled={loading === "end"}
          className={`w-full rounded-lg py-3 px-4 font-medium text-sm transition-all flex items-center justify-center gap-2 ${
            isFrozen
              ? "bg-green-600 hover:bg-green-500 text-white"
              : "bg-red-600 hover:bg-red-500 text-white"
          } disabled:opacity-50`}
        >
          {loading === "end" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <OctagonX className="h-4 w-4" />
          )}
          {isFrozen ? "Resume Game" : "End Game"}
        </button>

        {/* Reset Game */}
        <button
          onClick={handleReset}
          disabled={loading === "reset"}
          className={`w-full rounded-lg py-3 px-4 font-medium text-sm transition-all flex items-center justify-center gap-2 border ${
            confirmReset
              ? "bg-orange-600 border-orange-500 text-white"
              : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
          } disabled:opacity-50`}
        >
          {loading === "reset" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          {confirmReset ? "Click again to confirm reset!" : "Reset Game"}
        </button>
      </div>
    </div>
  );
}
