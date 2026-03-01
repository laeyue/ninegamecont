"use client";

import { Trophy, DollarSign, Pickaxe, Cpu } from "lucide-react";
import type { TeamData } from "@/types";
import { getTierTheme } from "@/lib/utils";
import { TIER_LABELS } from "@/lib/game-config";

interface GameFrozenProps {
  team: TeamData;
  allTeams: TeamData[];
}

export function GameFrozen({ team, allTeams }: GameFrozenProps) {
  const theme = getTierTheme(team.tier);
  const sorted = [...allTeams].sort((a, b) => b.wealth - a.wealth);
  const rank = sorted.findIndex((t) => t.id === team.id) + 1;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6">
          <Trophy className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Game Over</h1>
          <p className="text-gray-400">Final Results</p>
        </div>

        {/* Your results */}
        <div className={`${theme.bgCard} border ${theme.border} rounded-xl p-4 mb-4`}>
          <div className={`text-sm ${theme.accent} mb-2`}>
            {team.name} — {TIER_LABELS[team.tier]}
          </div>
          <div className="text-4xl font-bold text-white mb-1">#{rank}</div>
          <div className="text-gray-400 text-sm">out of {allTeams.length}</div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="text-center">
              <DollarSign className="h-4 w-4 mx-auto text-green-400 mb-1" />
              <div className="text-lg font-bold text-white">${team.wealth}</div>
              <div className="text-[10px] text-gray-500">WEALTH</div>
            </div>
            <div className="text-center">
              <Pickaxe className="h-4 w-4 mx-auto text-orange-400 mb-1" />
              <div className="text-lg font-bold text-white">{team.rawMaterials}</div>
              <div className="text-[10px] text-gray-500">MATERIALS</div>
            </div>
            <div className="text-center">
              <Cpu className="h-4 w-4 mx-auto text-blue-400 mb-1" />
              <div className="text-lg font-bold text-white">Lv.{team.techLevel}</div>
              <div className="text-[10px] text-gray-500">TECH</div>
            </div>
          </div>
        </div>

        {/* Mini leaderboard */}
        <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-800">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Leaderboard</div>
          <div className="space-y-1.5">
            {sorted.slice(0, 5).map((t, i) => {
              const tTheme = getTierTheme(t.tier);
              return (
                <div
                  key={t.id}
                  className={`flex items-center justify-between py-1.5 px-2 rounded ${
                    t.id === team.id ? "bg-white/5" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-4">#{i + 1}</span>
                    <span className={`text-sm ${tTheme.accent}`}>{t.name}</span>
                  </div>
                  <span className="text-sm font-medium text-white">${t.wealth}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
