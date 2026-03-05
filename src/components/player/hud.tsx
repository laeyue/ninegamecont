"use client";

import { DollarSign, Pickaxe, Cpu, LogOut, Clock } from "lucide-react";
import type { TeamData, GameStateData } from "@/types";
import type { MemberRole } from "@/hooks/use-member";
import { TIER_LABELS } from "@/lib/game-config";
import { getTierTheme } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";

const ROLE_BADGE: Record<MemberRole, { label: string; color: string }> = {
  MINER: { label: "Miner", color: "text-yellow-400 bg-yellow-900/30 border-yellow-700/40" },
  MANUFACTURER: { label: "Manufacturer", color: "text-blue-400 bg-blue-900/30 border-blue-700/40" },
  SABOTEUR: { label: "Saboteur", color: "text-red-400 bg-red-900/30 border-red-700/40" },
};

interface HudProps {
  team: TeamData;
  gameState: GameStateData | null;
  memberName: string;
  role: MemberRole;
  onLogout: () => void;
}

export function Hud({ team, gameState, memberName, role, onLogout }: HudProps) {
  const theme = getTierTheme(team.tier);
  const roleBadge = ROLE_BADGE[role];

  return (
    <div className={`fixed top-0 left-0 right-0 z-40 ${theme.header} backdrop-blur-md border-b ${theme.border}`}>
      {/* Team Info Row */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`font-bold text-sm ${theme.text} truncate`}>{team.name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${theme.badge} shrink-0`}>
            {TIER_LABELS[team.tier]}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <TimerDisplay gameState={gameState} />
          <button
            onClick={onLogout}
            className="text-gray-500 hover:text-gray-300 transition-colors"
            title="Switch group"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Member + Role Row */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-white/5">
        <span className="text-xs text-gray-400 truncate">{memberName}</span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleBadge.color} shrink-0`}>
          {roleBadge.label}
        </span>
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-around px-4 py-3">
        <StatItem
          icon={<DollarSign className="h-4 w-4" />}
          label="Wealth"
          value={`$${team.wealth}`}
          theme={theme}
          numericValue={team.wealth}
        />
        <div className="w-px h-8 bg-white/10" />
        <StatItem
          icon={<Pickaxe className="h-4 w-4" />}
          label="Materials"
          value={String(team.rawMaterials)}
          theme={theme}
          numericValue={team.rawMaterials}
        />
        <div className="w-px h-8 bg-white/10" />
        <StatItem
          icon={<Cpu className="h-4 w-4" />}
          label="Tech"
          value={`Lv.${team.techLevel}`}
          theme={theme}
          numericValue={team.techLevel}
        />
      </div>

      {/* FDI Warning */}
      {team.fdiInvestorId && (
        <div className="px-4 py-1.5 bg-red-900/30 border-t border-red-600/30 text-red-300 text-xs text-center">
          Foreign investor extracts 50% of your manufacturing profits
        </div>
      )}
    </div>
  );
}

function StatItem({
  icon,
  label,
  value,
  theme,
  numericValue,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  theme: ReturnType<typeof getTierTheme>;
  numericValue?: number;
}) {
  const [animations, setAnimations] = useState<{ id: string; diff: number }[]>([]);
  const prevValueRef = useRef<number | undefined>(numericValue);

  useEffect(() => {
    if (numericValue !== undefined && prevValueRef.current !== undefined) {
      const diff = numericValue - prevValueRef.current;
      if (diff !== 0) {
        const id = Math.random().toString();
        setAnimations((prev) => [...prev, { id, diff }]);
        setTimeout(() => {
          setAnimations((prev) => prev.filter((a) => a.id !== id));
        }, 1000);
      }
    }
    prevValueRef.current = numericValue;
  }, [numericValue]);

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className={`flex items-center gap-1 ${theme.accent}`}>
        {icon}
        <span className="text-lg font-bold relative inline-block">
          {value}
          {animations.map((a) => (
            <span
              key={a.id}
              className={`absolute left-1/2 -ml-2 -top-2 text-xs font-black pointer-events-none drop-shadow-md animate-floatUp ${a.diff > 0 ? "text-green-400" : "text-red-500"
                }`}
            >
              {a.diff > 0 ? "+" : ""}
              {a.diff}
            </span>
          ))}
        </span>
      </div>
      <span className="text-[10px] text-gray-500 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

function TimerDisplay({ gameState }: { gameState: GameStateData | null }) {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (!gameState) return;

    if (!gameState.timerRunning) {
      setRemainingSeconds(gameState.timerSeconds);
      return;
    }

    if (!gameState.timerEndsAt) {
      setRemainingSeconds(gameState.timerSeconds);
      return;
    }

    const endTime = new Date(gameState.timerEndsAt).getTime();

    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setRemainingSeconds(remaining);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [gameState]);

  if (remainingSeconds === null) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const isLow = remainingSeconds <= 60;

  return (
    <div className={`flex items-center gap-1 text-xs font-mono ${isLow ? "text-red-400" : "text-gray-400"}`}>
      <Clock className="h-3 w-3" />
      <span>
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </span>
    </div>
  );
}
