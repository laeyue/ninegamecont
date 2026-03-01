"use client";

import { useTeam } from "@/hooks/use-team";
import { Leaderboard } from "@/components/admin/leaderboard";
import { ActivityFeed } from "@/components/admin/activity-feed";
import { GodMode } from "@/components/admin/god-mode";
import { TimerControl } from "@/components/admin/timer-control";
import { GameControl } from "@/components/admin/game-control";
import { MemberPanel } from "@/components/admin/member-panel";
import { Globe, Wifi, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
  const { allTeams, gameState, logs, loading, refresh } = useTeam(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p className="text-gray-400">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="bg-gray-900/80 border-b border-gray-800 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/play"
              className="text-gray-400 hover:text-white transition-colors"
              title="Back to player view"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Globe className="h-6 w-6 text-blue-400" />
            <h1 className="text-lg font-bold">The Global Economy — Admin</h1>
          </div>
          <div className="flex items-center gap-4">
            <TimerControl gameState={gameState} />
            <div className="flex items-center gap-1.5 text-xs text-green-400">
              <Wifi className="h-3 w-3" />
              <span>Live</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Leaderboard — takes 8 cols on desktop */}
          <div className="col-span-12 lg:col-span-8">
            <Leaderboard teams={allTeams} />
          </div>

          {/* Right sidebar — 4 cols */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* Game Controls */}
            <GameControl gameState={gameState} onReset={refresh} />

            {/* God Mode */}
            <GodMode teams={allTeams} gameState={gameState} />

            {/* Member Roles Panel */}
            <MemberPanel teams={allTeams} />

            {/* Activity Feed */}
            <ActivityFeed logs={logs} />
          </div>
        </div>
      </main>
    </div>
  );
}
