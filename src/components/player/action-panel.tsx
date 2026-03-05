"use client";

import { useState } from "react";
import { Pickaxe, Factory, Loader2, Skull } from "lucide-react";
import type { TeamData, GameStateData } from "@/types";
import type { MemberRole } from "@/hooks/use-member";
import { canMine, canManufacture, getMineCooldownMs, getManufactureOutput, getManufactureCooldownMs } from "@/lib/game-config";
import { getTierTheme, cn } from "@/lib/utils";
import { useCooldown } from "@/hooks/use-cooldown";

interface ActionPanelProps {
  team: TeamData;
  gameState: GameStateData | null;
  role: MemberRole;
  memberId: string;
}

export function ActionPanel({ team, gameState, role, memberId }: ActionPanelProps) {
  const theme = getTierTheme(team.tier);
  const isFrozen = gameState?.gameFrozen ?? false;
  const showMine = canMine(team.tier) && role === "MINER";
  const showManufacture = canManufacture(team.tier, team.techLevel) && role === "MANUFACTURER";
  const mineCooldownMs = getMineCooldownMs(team.tier);
  const mfgCooldownMs = getManufactureCooldownMs(team.tier);
  const { isOnCooldown: mineOnCooldown, remainingMs: mineRemainingMs, trigger: triggerMineCooldown } = useCooldown(mineCooldownMs);
  const { isOnCooldown: mfgOnCooldown, remainingMs: mfgRemainingMs, trigger: triggerMfgCooldown } = useCooldown(mfgCooldownMs);
  const [mineLoading, setMineLoading] = useState(false);
  const [mfgLoading, setMfgLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMine = async () => {
    if (isFrozen || mineOnCooldown || mineLoading) return;
    setError(null);
    setMineLoading(true);
    triggerMineCooldown();

    try {
      const res = await fetch("/api/game/mine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: team.id, memberId }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to mine");
      }
    } catch {
      setError("Network error");
    } finally {
      setMineLoading(false);
    }
  };

  const handleManufacture = async () => {
    if (isFrozen || mfgLoading || mfgOnCooldown || team.rawMaterials < 1) return;
    setError(null);
    setMfgLoading(true);
    triggerMfgCooldown();

    try {
      const res = await fetch("/api/game/manufacture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: team.id, memberId }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to manufacture");
      }
    } catch {
      setError("Network error");
    } finally {
      setMfgLoading(false);
    }
  };

  return (
    <div className={`${theme.bgCard} border ${theme.border} rounded-xl p-4`}>
      <h2 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${theme.accent}`}>
        Actions
      </h2>

      {/* Saboteur — redirect to sabotage panel below */}
      {role === "SABOTEUR" && (
        <div className="rounded-lg py-6 px-4 bg-red-900/20 border border-red-700/30 text-center">
          <Skull className="h-8 w-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-300 font-medium text-sm">Saboteur Role</p>
          <p className="text-red-400/60 text-xs mt-1">
            Your sabotage actions are in the panel below.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {/* Mine Button */}
        {showMine && (
          <button
            onClick={handleMine}
            disabled={isFrozen || mineOnCooldown || mineLoading}
            className={cn(
              "w-full relative overflow-hidden rounded-lg py-4 px-6 font-bold text-lg transition-all active:scale-[0.97]",
              isFrozen || mineOnCooldown
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : theme.button
            )}
          >
            {/* Cooldown progress bar */}
            {mineOnCooldown && (
              <div
                className="absolute inset-0 bg-white/10 transition-all"
                style={{ width: `${((mineCooldownMs - mineRemainingMs) / mineCooldownMs) * 100}%` }}
              />
            )}
            <div className="relative flex items-center justify-center gap-3">
              {mineLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Pickaxe className="h-6 w-6" />
              )}
              <span>
                {mineOnCooldown
                  ? `Mining... ${(mineRemainingMs / 1000).toFixed(1)}s`
                  : "Mine Resources"}
              </span>
            </div>
          </button>
        )}

        {/* Manufacture Button */}
        {showManufacture ? (
          <button
            onClick={handleManufacture}
            disabled={isFrozen || mfgLoading || mfgOnCooldown || team.rawMaterials < 1}
            className={cn(
              "w-full relative overflow-hidden rounded-lg py-4 px-6 font-bold text-lg transition-all active:scale-[0.97]",
              isFrozen || mfgOnCooldown || team.rawMaterials < 1
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : theme.button
            )}
          >
            {/* Cooldown progress bar */}
            {mfgOnCooldown && (
              <div
                className="absolute inset-0 bg-white/10 transition-all"
                style={{ width: `${((mfgCooldownMs - mfgRemainingMs) / mfgCooldownMs) * 100}%` }}
              />
            )}
            <div className="relative flex items-center justify-center gap-3">
              {mfgLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Factory className="h-6 w-6" />
              )}
              <span>
                {mfgOnCooldown
                  ? `Manufacturing... ${(mfgRemainingMs / 1000).toFixed(1)}s`
                  : `Manufacture (+$${getManufactureOutput(team.tier, team.techLevel)}${team.fdiInvestorId ? " / 50% taxed" : ""})`}
              </span>
            </div>
            {!mfgOnCooldown && (
              <div className="text-xs mt-1 opacity-70">
                Costs 1 Raw Material
              </div>
            )}
          </button>
        ) : (
          role === "MANUFACTURER" && team.techLevel < 1 && (
            <div className="rounded-lg py-4 px-6 bg-gray-800/50 border border-gray-700/50 text-center">
              <Factory className="h-6 w-6 text-gray-600 mx-auto mb-1" />
              <p className="text-gray-500 text-sm">Manufacturing Unavailable</p>
              <p className="text-gray-600 text-xs">Tech Level 0 — No industrial capacity</p>
            </div>
          )
        )}

        {/* Miner role but team can't mine (Core) */}
        {role === "MINER" && !canMine(team.tier) && (
          <div className="text-center text-xs text-gray-600 py-1">
            Core nations do not mine raw materials — your Manufacturer trades on the market below
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-3 text-red-400 text-sm text-center bg-red-900/20 rounded-lg py-2">
          {error}
        </div>
      )}
    </div>
  );
}
