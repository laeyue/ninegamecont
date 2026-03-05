"use client";

import { useState } from "react";
import { Zap, Landmark, Loader2, AlertTriangle } from "lucide-react";
import type { TeamData, GameStateData } from "@/types";
import { Tier } from "@prisma/client";

interface GodModeProps {
  teams: TeamData[];
  gameState: GameStateData | null;
}

export function GodMode({ teams, gameState }: GodModeProps) {
  const isFrozen = gameState?.gameFrozen ?? false;
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // FDI form state
  const [showFdi, setShowFdi] = useState(false);
  const [investorId, setInvestorId] = useState("");
  const [recipientId, setRecipientId] = useState("");

  // Confirm state for debt crisis
  const [confirmDebt, setConfirmDebt] = useState(false);

  const coreTeams = teams.filter((t) => t.tier === Tier.CORE);
  const peripheryTeams = teams.filter((t) => (t.tier === Tier.PERIPHERY || t.tier === Tier.SEMI_PERIPHERY) && !t.fdiInvestorId);

  const handleDebtCrisis = async () => {
    if (!confirmDebt) {
      setConfirmDebt(true);
      setTimeout(() => setConfirmDebt(false), 3000);
      return;
    }

    setLoading("debt");
    setMessage(null);
    setConfirmDebt(false);

    try {
      const res = await fetch("/api/events/debt-crisis", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setMessage("Debt crisis triggered!");
      } else {
        setMessage(data.error || "Failed");
      }
    } catch {
      setMessage("Network error");
    } finally {
      setLoading(null);
    }
  };

  const handleFdi = async () => {
    if (!investorId || !recipientId) {
      setMessage("Select both investor and recipient");
      return;
    }

    setLoading("fdi");
    setMessage(null);

    try {
      const res = await fetch("/api/sabotage/fdi-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ investorId, targetId: recipientId }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage("FDI proposal sent! Periphery team is voting...");
        setShowFdi(false);
        setInvestorId("");
        setRecipientId("");
      } else {
        setMessage(data.error || "Failed");
      }
    } catch {
      setMessage("Network error");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-gray-900/50 border border-red-900/30 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-4 w-4 text-red-400" />
        <h2 className="text-sm font-bold text-red-400">Global Events (God Mode)</h2>
      </div>

      <div className="space-y-3">
        {/* Debt Crisis */}
        <button
          onClick={handleDebtCrisis}
          disabled={isFrozen || loading === "debt"}
          className={`w-full rounded-lg py-3 px-4 text-left transition-all border ${confirmDebt
            ? "bg-red-900/50 border-red-600 text-red-200"
            : "bg-red-950/30 border-red-900/30 text-red-300 hover:bg-red-950/50"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <div className="flex items-center gap-2">
            {loading === "debt" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <span className="font-medium text-sm">
              {confirmDebt ? "Click again to confirm!" : "Trigger Debt Crisis"}
            </span>
          </div>
          <p className="text-xs text-red-400/60 mt-1">
            Halves all Periphery teams&apos; wealth instantly
          </p>
        </button>

        {/* FDI */}
        {!showFdi ? (
          <button
            onClick={() => setShowFdi(true)}
            disabled={isFrozen || peripheryTeams.length === 0}
            className="w-full rounded-lg py-3 px-4 text-left transition-all border bg-blue-950/30 border-blue-900/30 text-blue-300 hover:bg-blue-950/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4" />
              <span className="font-medium text-sm">Foreign Direct Investment</span>
            </div>
            <p className="text-xs text-blue-400/60 mt-1">
              Proposes FDI — Periphery team votes to accept or reject
            </p>
            {peripheryTeams.length === 0 && (
              <p className="text-xs text-yellow-500 mt-1">No eligible recipients</p>
            )}
          </button>
        ) : (
          <div className="rounded-lg p-3 border border-blue-900/30 bg-blue-950/20">
            <div className="space-y-2 mb-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Core Investor
                </label>
                <select
                  value={investorId}
                  onChange={(e) => setInvestorId(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="">Select investor...</option>
                  {coreTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Periphery Recipient
                </label>
                <select
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="">Select recipient...</option>
                  {peripheryTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleFdi}
                disabled={loading === "fdi"}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2 text-sm font-medium transition-all disabled:opacity-50"
              >
                {loading === "fdi" ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  "Send Proposal"
                )}
              </button>
              <button
                onClick={() => {
                  setShowFdi(false);
                  setInvestorId("");
                  setRecipientId("");
                }}
                className="px-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg py-2 text-sm transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Status message */}
      {message && (
        <div className="mt-3 text-sm text-center text-gray-300 bg-black/20 rounded-lg py-2">
          {message}
        </div>
      )}
    </div>
  );
}
