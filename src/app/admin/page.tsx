"use client";

import { useState, useCallback, useRef } from "react";
import { useTeam } from "@/hooks/use-team";
import { useSSE } from "@/hooks/use-sse";
import { Leaderboard } from "@/components/admin/leaderboard";
import { ActivityFeed } from "@/components/admin/activity-feed";
import { GodMode } from "@/components/admin/god-mode";
import { TimerControl } from "@/components/admin/timer-control";
import { GameControl } from "@/components/admin/game-control";
import { MemberPanel } from "@/components/admin/member-panel";
import { NewsFlash, type NewsItem } from "@/components/player/news-flash";
import { Globe, Wifi, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
  const { allTeams, gameState, logs, loading, refresh } = useTeam(null);
  const [newsItem, setNewsItem] = useState<NewsItem | null>(null);
  const newsIdCounter = useRef(0);

  const pushNews = useCallback((headline: string, type: NewsItem["type"]) => {
    newsIdCounter.current += 1;
    setNewsItem({ id: String(newsIdCounter.current), headline, type });
  }, []);

  useSSE({
    "embargo-imposed": (data: unknown) => {
      const d = data as { targetName: string; imposedByName: string };
      pushNews(`${d.imposedByName} imposed a TRADE EMBARGO on ${d.targetName}!`, "sabotage");
    },
    "espionage-result": (data: unknown) => {
      const d = data as { attackerName: string; targetName: string; succeeded: boolean };
      if (d.succeeded) {
        pushNews(`${d.attackerName} stole technology from ${d.targetName}!`, "sabotage");
      } else {
        pushNews(`${d.attackerName} failed to spy on ${d.targetName} and was fined!`, "sabotage");
      }
    },
    "strike-started": (data: unknown) => {
      const d = data as { teamName: string; investorName: string };
      pushNews(`${d.teamName} called a WORKER STRIKE! ${d.investorName} loses money.`, "sabotage");
    },
    "revolution": (data: unknown) => {
      const d = data as { teamName: string; investorName: string };
      pushNews(`REVOLUTION! ${d.teamName} overthrew ${d.investorName}'s foreign control!`, "crisis");
    },
    "tariff-imposed": (data: unknown) => {
      const d = data as { targetName: string; imposedByName: string };
      pushNews(`${d.imposedByName} imposed a TRADE TARIFF on ${d.targetName} — 50% sale tax for 60s!`, "sabotage");
    },
    "resource-synthesized": (data: unknown) => {
      const d = data as { teamName: string; cost: number };
      pushNews(`${d.teamName} synthesized raw materials, bypassing the market!`, "diplomacy");
    },
    "fdi-proposal": (data: unknown) => {
      const d = data as { investorName: string; targetName: string };
      pushNews(`${d.investorName} proposed FDI to ${d.targetName} — vote in progress!`, "diplomacy");
    },
    "fdi-vote-result": (data: unknown) => {
      const d = data as { investorName: string; targetName: string; result: string };
      if (d.result === "accepted") {
        pushNews(`${d.targetName} ACCEPTED FDI from ${d.investorName}!`, "diplomacy");
      } else {
        pushNews(`${d.targetName} REJECTED FDI from ${d.investorName}!`, "crisis");
      }
    },
    "event-log": (data: unknown) => {
      const d = data as { log: { message: string } };
      const msg = d.log.message;
      if (msg.includes("FOREIGN DIRECT INVESTMENT")) {
        const clean = msg.replace(/^[^\w]*/, "").replace("FOREIGN DIRECT INVESTMENT — ", "");
        pushNews(`FDI: ${clean}`, "diplomacy");
      } else if (msg.includes("DEBT CRISIS")) {
        pushNews("DEBT CRISIS! All Periphery nations have had their wealth halved!", "crisis");
      }
    },
  });

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
      <NewsFlash item={newsItem} />

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
