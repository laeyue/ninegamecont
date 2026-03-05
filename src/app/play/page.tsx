"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTeam } from "@/hooks/use-team";
import { useMember } from "@/hooks/use-member";
import { useSSE } from "@/hooks/use-sse";
import { TutorialDialog } from "@/components/player/tutorial-dialog";
import { TeamSelector } from "@/components/player/team-selector";
import { MemberEntry } from "@/components/player/member-entry";
import { Hud } from "@/components/player/hud";
import { ActionPanel } from "@/components/player/action-panel";
import { MarketPanel } from "@/components/player/market-panel";
import { SabotagePanel } from "@/components/player/sabotage-panel";
import { FdiVoteDialog } from "@/components/player/fdi-vote-dialog";
import { GameFrozen } from "@/components/player/game-frozen";
import { GameWaiting } from "@/components/player/game-waiting";
import { NewsFlash, type NewsItem } from "@/components/player/news-flash";
import { getTierTheme } from "@/lib/utils";
import { DEFAULT_TIMER_SECONDS } from "@/lib/game-config";
import type { Member } from "@/hooks/use-member";

export default function PlayPage() {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [newsItem, setNewsItem] = useState<NewsItem | null>(null);
  const [fdiProposal, setFdiProposal] = useState<{
    investorName: string;
    targetTeamId: string;
    expiresAt: number;
  } | null>(null);
  const newsIdCounter = useRef(0);

  const pushNews = useCallback((headline: string, type: NewsItem["type"]) => {
    newsIdCounter.current += 1;
    setNewsItem({ id: String(newsIdCounter.current), headline, type });
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("selectedTeamId");
    if (stored) setSelectedTeamId(stored);

    // Show tutorial on very first visit (no tutorialDone key yet)
    if (!localStorage.getItem("tutorialDone")) {
      setShowTutorial(true);
    }
  }, []);

  const handleTutorialComplete = () => {
    setShowTutorial(false);
    localStorage.setItem("tutorialDone", "1");
  };

  const handleSelectTeam = (teamId: string) => {
    setSelectedTeamId(teamId);
    localStorage.setItem("selectedTeamId", teamId);
  };

  const handleLogout = () => {
    if (member) leave();
    setSelectedTeamId(null);
    localStorage.removeItem("selectedTeamId");
  };

  const { team, allTeams, orders, gameState, loading } = useTeam(selectedTeamId);
  const { member, loading: memberLoading, error: memberError, join, leave, resetMember, applyRoleRotation } = useMember(selectedTeamId);

  // Listen for SSE events — role rotations + news flash triggers + game reset
  useSSE({
    "game-reset": () => {
      // Clear all member data completely, wiping their UUID as well so they must rejoin
      const tutorialStatus = localStorage.getItem("tutorialDone");
      localStorage.clear();
      if (tutorialStatus) {
        localStorage.setItem("tutorialDone", tutorialStatus);
      }

      resetMember();
      setSelectedTeamId(null);
      pushNews("GAME RESET — All players must rejoin!", "system");
    },
    "roles-rotated": (data: unknown) => {
      const { teamId, members } = data as { teamId: string; members: Member[] };
      if (teamId === selectedTeamId) {
        applyRoleRotation(members);
      }
    },
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
      const d = data as { investorName: string; targetTeamId: string; expiresAt: number };
      // Show dialog only if this proposal is for our team
      if (d.targetTeamId === selectedTeamId) {
        setFdiProposal({
          investorName: d.investorName,
          targetTeamId: d.targetTeamId,
          expiresAt: d.expiresAt,
        });
      } else {
        pushNews(`${d.investorName} proposed FDI to a Periphery nation!`, "diplomacy");
      }
    },
    "fdi-vote-result": (data: unknown) => {
      const d = data as { investorName: string; targetName: string; result: string };
      setFdiProposal(null); // Close dialog
      if (d.result === "accepted") {
        pushNews(`${d.targetName} ACCEPTED FDI from ${d.investorName}!`, "diplomacy");
      } else {
        pushNews(`${d.targetName} REJECTED FDI from ${d.investorName}!`, "crisis");
      }
    },
    "game-state-update": (data: unknown) => {
      const d = data as { state: { gameFrozen: boolean } };
      if (d.state.gameFrozen) {
        pushNews("GAME ENDED — All trading has been frozen!", "system");
      }
    },
    "event-log": (data: unknown) => {
      const d = data as { log: { message: string } };
      const msg = d.log.message;
      if (msg.includes("FOREIGN DIRECT INVESTMENT")) {
        // Strip emoji prefix for cleaner display
        const clean = msg.replace(/^[^\w]*/, "").replace("FOREIGN DIRECT INVESTMENT — ", "");
        pushNews(`FDI: ${clean}`, "diplomacy");
      } else if (msg.includes("DEBT CRISIS")) {
        pushNews("DEBT CRISIS! All Periphery nations have had their wealth halved!", "crisis");
      } else if (msg.includes("Game resumed")) {
        pushNews("Game has resumed — Trading is open!", "system");
      }
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p className="text-gray-400">Connecting to game server...</p>
        </div>
      </div>
    );
  }

  // Step 0: show tutorial on first visit
  if (showTutorial && !selectedTeamId) {
    return <TutorialDialog onComplete={handleTutorialComplete} />;
  }

  // Step 1: pick a team
  if (!selectedTeamId || !team) {
    return (
      <TeamSelector
        teams={allTeams}
        onSelect={handleSelectTeam}
      />
    );
  }

  // Step 2: enter name + get a role
  if (!member) {
    return (
      <MemberEntry
        team={team}
        onJoin={join}
        onBack={() => {
          setSelectedTeamId(null);
          localStorage.removeItem("selectedTeamId");
        }}
        loading={memberLoading}
        error={memberError}
      />
    );
  }

  const theme = getTierTheme(team.tier);

  // Pre-game: timer not started, full duration, not frozen
  const isPreGame = !gameState?.timerRunning && !gameState?.gameFrozen
    && (gameState?.timerSeconds ?? DEFAULT_TIMER_SECONDS) === DEFAULT_TIMER_SECONDS;

  return (
    <div className={`min-h-screen ${theme.bg} relative`}>
      {/* News Flash Banner */}
      <NewsFlash item={newsItem} />

      {/* Pre-game waiting overlay */}
      {isPreGame && <GameWaiting team={team} memberName={member.name} />}

      {/* Game Frozen Overlay */}
      {!isPreGame && gameState?.gameFrozen && <GameFrozen team={team} allTeams={allTeams} />}

      {/* FDI Vote Dialog */}
      {fdiProposal && member && (
        <FdiVoteDialog
          investorName={fdiProposal.investorName}
          targetTeamId={fdiProposal.targetTeamId}
          expiresAt={fdiProposal.expiresAt}
          memberId={member.memberId}
          onClose={() => setFdiProposal(null)}
        />
      )}

      {/* HUD */}
      <Hud
        team={team}
        gameState={gameState}
        memberName={member.name}
        role={member.role}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="pt-[168px] pb-6 px-4 max-w-lg mx-auto space-y-4">
        {/* Actions */}
        <ActionPanel team={team} gameState={gameState} role={member.role} memberId={member.memberId} />

        {/* Sabotage (only for SABOTEUR role) */}
        {member.role === "SABOTEUR" && (
          <SabotagePanel team={team} allTeams={allTeams} gameState={gameState} memberId={member.memberId} />
        )}

        {/* Market */}
        <MarketPanel
          team={team}
          orders={orders}
          gameState={gameState}
          role={member.role}
          memberId={member.memberId}
        />
      </main>
    </div>
  );
}
