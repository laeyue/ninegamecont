"use client";

import { useState } from "react";
import { User, Pickaxe, Factory, Skull, Loader2, ArrowLeft } from "lucide-react";
import type { TeamData } from "@/types";
import type { MemberRole } from "@/hooks/use-member";
import { getTierTheme } from "@/lib/utils";
import { TIER_LABELS } from "@/lib/game-config";

interface MemberEntryProps {
  team: TeamData;
  onJoin: (name: string) => void;
  onBack: () => void;
  loading: boolean;
  error: string | null;
}

const ROLE_INFO: Record<MemberRole, { icon: React.ReactNode; label: string; desc: string }> = {
  MINER: {
    icon: <Pickaxe className="h-5 w-5" />,
    label: "Miner",
    desc: "Extract raw materials & sell on the market",
  },
  MANUFACTURER: {
    icon: <Factory className="h-5 w-5" />,
    label: "Manufacturer",
    desc: "Convert materials into wealth & buy from market",
  },
  SABOTEUR: {
    icon: <Skull className="h-5 w-5" />,
    label: "Saboteur",
    desc: "Embargoes, espionage, strikes & revolutions",
  },
};

export function MemberEntry({ team, onJoin, onBack, loading, error }: MemberEntryProps) {
  const [name, setName] = useState("");
  const theme = getTierTheme(team.tier);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || loading) return;
    onJoin(name.trim());
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to group selection</span>
        </button>

        {/* Team badge */}
        <div className={`text-center mb-8`}>
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${theme.badge} mb-4`}
          >
            <span className={`font-bold text-sm ${theme.text}`}>{team.name}</span>
            <span className={`text-xs ${theme.accent}`}>{TIER_LABELS[team.tier]}</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Who are you?</h2>
          <p className="text-gray-400 text-sm">
            Enter your name to join — a role will be assigned to you automatically
          </p>
        </div>

        {/* Name form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Your name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                maxLength={30}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 text-base"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center bg-red-900/20 rounded-lg py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!name.trim() || loading}
            className={`w-full py-3 rounded-xl font-bold text-base transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${theme.button}`}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            ) : (
              "Join Game"
            )}
          </button>
        </form>

        {/* Role info — non-interactive */}
        <div className="mt-8">
          <p className="text-xs text-gray-600 uppercase tracking-wider text-center mb-3">
            Roles assigned in join order
          </p>
          <div className="space-y-1">
            {(Object.keys(ROLE_INFO) as MemberRole[]).map((role, idx) => {
              const info = ROLE_INFO[role];
              // Hide Miner role preview for Core teams
              if (role === "MINER" && team.tier === "CORE") return null;
              const orderNum = team.tier === "CORE"
                ? idx // CORE skips MINER so index is already correct
                : idx + 1;
              return (
                <div
                  key={role}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 opacity-50"
                >
                  <span className="text-xs text-gray-600 font-mono w-4">{orderNum}.</span>
                  <div className="text-gray-600">{info.icon}</div>
                  <div>
                    <span className="text-xs text-gray-500">{info.label}</span>
                    <span className="text-xs text-gray-700 ml-2">— {info.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
