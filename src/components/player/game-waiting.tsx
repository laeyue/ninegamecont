"use client";

import { Clock, Users, BookOpen } from "lucide-react";
import Link from "next/link";
import type { TeamData } from "@/types";
import { getTierTheme } from "@/lib/utils";
import { TIER_LABELS } from "@/lib/game-config";

interface GameWaitingProps {
  team: TeamData;
  memberName: string;
}

export function GameWaiting({ team, memberName }: GameWaitingProps) {
  const theme = getTierTheme(team.tier);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6">
          <div className="relative mx-auto w-16 h-16 mb-4">
            <Clock className="h-16 w-16 text-blue-400 animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Waiting for Game</h1>
          <p className="text-gray-400 text-sm">
            The teacher will start the game soon
          </p>
        </div>

        <div className={`${theme.bgCard} border ${theme.border} rounded-xl p-4 mb-4`}>
          <div className={`text-sm ${theme.accent} mb-1`}>
            {team.name} — {TIER_LABELS[team.tier]}
          </div>
          <div className="text-xs text-gray-500">
            Signed in as <span className="text-gray-300">{memberName}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-gray-600 mb-6">
          <Users className="h-3.5 w-3.5" />
          <span>All players should join before the game starts</span>
        </div>

        <Link
          href="/guide"
          className="inline-flex items-center justify-center gap-2 bg-gray-800/60 border border-gray-700 hover:border-blue-500/50 hover:bg-gray-800 text-gray-300 hover:text-white rounded-lg py-3 px-6 transition-all text-sm font-medium w-full"
        >
          <BookOpen className="h-4 w-4" />
          Read Player Guide
        </Link>
      </div>
    </div>
  );
}
