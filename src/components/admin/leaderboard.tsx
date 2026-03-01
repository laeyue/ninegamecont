"use client";

import { DollarSign, TrendingUp, Pickaxe, Cpu } from "lucide-react";
import type { TeamData } from "@/types";
import { TIER_LABELS } from "@/lib/game-config";
import { getTierTheme } from "@/lib/utils";

interface LeaderboardProps {
  teams: TeamData[];
}

export function Leaderboard({ teams }: LeaderboardProps) {
  const sorted = [...teams].sort((a, b) => b.wealth - a.wealth);
  const maxWealth = Math.max(...sorted.map((t) => t.wealth), 1);

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="h-5 w-5 text-blue-400" />
        <h2 className="text-lg font-bold">Live Leaderboard</h2>
      </div>

      <div className="space-y-3">
        {sorted.map((team, index) => {
          const theme = getTierTheme(team.tier);
          const barWidth = Math.max(2, (team.wealth / maxWealth) * 100);
          const isTop3 = index < 3;

          return (
            <div
              key={team.id}
              className={`relative overflow-hidden rounded-lg border transition-all duration-500 ${
                isTop3 ? "border-yellow-600/20" : "border-gray-800"
              }`}
            >
              {/* Background wealth bar */}
              <div
                className="absolute inset-y-0 left-0 opacity-15 transition-all duration-700 ease-out"
                style={{
                  width: `${barWidth}%`,
                  background:
                    team.tier === "CORE"
                      ? "linear-gradient(90deg, #059669, #d97706)"
                      : team.tier === "SEMI_PERIPHERY"
                      ? "linear-gradient(90deg, #2563eb, #3b82f6)"
                      : "linear-gradient(90deg, #d97706, #f59e0b)",
                }}
              />

              {/* Content */}
              <div className="relative flex items-center p-4">
                {/* Rank */}
                <div className="w-10 shrink-0">
                  <span
                    className={`text-2xl font-bold ${
                      index === 0
                        ? "text-yellow-400"
                        : index === 1
                        ? "text-gray-300"
                        : index === 2
                        ? "text-amber-600"
                        : "text-gray-600"
                    }`}
                  >
                    {index + 1}
                  </span>
                </div>

                {/* Team Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">
                      {team.name}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full border ${theme.badge}`}
                    >
                      {TIER_LABELS[team.tier]}
                    </span>
                    {team.fdiInvestorId && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-900/30 text-red-400 border border-red-800/30">
                        FDI
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-1 text-sm">
                    <Pickaxe className="h-3 w-3 text-orange-400" />
                    <span className="text-gray-400">{team.rawMaterials}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <Cpu className="h-3 w-3 text-blue-400" />
                    <span className="text-gray-400">{team.techLevel}</span>
                  </div>
                  <div className="flex items-center gap-1 min-w-[80px] justify-end">
                    <DollarSign className="h-4 w-4 text-green-400" />
                    <span className="text-xl font-bold text-white">
                      {team.wealth}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
