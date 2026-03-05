"use client";

import { Globe, Users, BookOpen } from "lucide-react";
import Link from "next/link";
import type { TeamData } from "@/types";
import { TIER_LABELS } from "@/lib/game-config";
import { getTierTheme } from "@/lib/utils";
import { TutorialDialog } from "./tutorial-dialog";

interface TeamSelectorProps {
  teams: TeamData[];
  onSelect: (teamId: string) => void;
}

export function TeamSelector({ teams, onSelect }: TeamSelectorProps) {
  const tiers = ["CORE", "SEMI_PERIPHERY", "PERIPHERY"] as const;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Globe className="h-16 w-16 text-blue-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">
            The Global Economy
          </h1>
          <p className="text-gray-400 text-sm">
            Select your group to join the simulation
          </p>
        </div>

        {/* Team List by Tier */}
        <div className="space-y-4">
          {tiers.map((tier) => {
            const tierTeams = teams.filter((t) => t.tier === tier);
            if (tierTeams.length === 0) return null;

            const sampleTheme = getTierTheme(tier);

            return (
              <div key={tier}>
                <h2
                  className={`text-xs font-semibold uppercase tracking-wider mb-2 ${sampleTheme.accent}`}
                >
                  {TIER_LABELS[tier]}
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {tierTeams.map((team) => {
                    const theme = getTierTheme(team.tier);
                    return (
                      <button
                        key={team.id}
                        onClick={() => onSelect(team.id)}
                        className={`${theme.bgCard} border ${theme.border} rounded-lg p-3 text-left transition-all hover:scale-[1.02] active:scale-[0.98]`}
                      >
                        <div className="flex items-center gap-2">
                          <Users className={`h-4 w-4 ${theme.accent}`} />
                          <span className={`font-medium text-sm ${theme.text}`}>
                            {team.name}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {teams.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p>No teams available. Waiting for game to start...</p>
          </div>
        )}

        {/* How to Play button */}
        <Link
          href="/guide"
          className="mt-6 w-full flex items-center justify-center gap-2 bg-gray-800/60 border border-gray-700 hover:border-blue-500/50 hover:bg-gray-800 text-gray-300 hover:text-white rounded-lg py-3 px-4 transition-all text-sm font-medium"
        >
          <BookOpen className="h-4 w-4" />
          Read Player Guide
        </Link>
      </div>
    </div>
  );
}
