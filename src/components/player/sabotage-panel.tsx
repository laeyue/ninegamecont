"use client";

import { useState, useEffect, useCallback } from "react";
import { Skull, Ban, Eye, Megaphone, Flame, Loader2, Scale, FlaskConical } from "lucide-react";
import type { TeamData, GameStateData } from "@/types";
import { getTierTheme, cn } from "@/lib/utils";
import {
  EMBARGO_COST,
  ESPIONAGE_COST_ON_FAIL,
  ESPIONAGE_SUCCESS_CHANCE,
  STRIKE_INVESTOR_PENALTY,
  REVOLUTION_WEALTH_THRESHOLD,
  TARIFF_COST,
  SYNTHESIS_COST,
  SYNTHESIS_COOLDOWN_MS,
} from "@/lib/game-config";
import { Tier } from "@prisma/client";

interface SabotagePanelProps {
  team: TeamData;
  allTeams: TeamData[];
  gameState: GameStateData | null;
  memberId: string;
}

interface SabotageStatus {
  embargoes: { targetTeamId: string; imposedByName: string; until: number }[];
  strikes: { teamId: string; teamName: string; until: number }[];
  tariffs: { targetTeamId: string; imposedByName: string; rate: number; until: number }[];
}

export function SabotagePanel({ team, allTeams, gameState, memberId }: SabotagePanelProps) {
  const theme = getTierTheme(team.tier);
  const isFrozen = gameState?.gameFrozen ?? false;

  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [targetId, setTargetId] = useState("");
  const [status, setStatus] = useState<SabotageStatus>({ embargoes: [], strikes: [], tariffs: [] });
  const [synthCooldown, setSynthCooldown] = useState(0);

  // Poll sabotage status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/sabotage/status");
      const data = await res.json();
      if (data.success) setStatus(data.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Synthesis cooldown timer (client-side display)
  useEffect(() => {
    if (synthCooldown <= 0) return;
    const interval = setInterval(() => {
      setSynthCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [synthCooldown]);

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  // --- Determine available actions based on tier ---
  const isCore = team.tier === Tier.CORE;
  const isSemiP = team.tier === Tier.SEMI_PERIPHERY;
  const isPeriphery = team.tier === Tier.PERIPHERY;

  const canEmbargo = isCore || isSemiP;
  const canEspionage = isPeriphery || isSemiP;
  const canStrike = isPeriphery && !!team.fdiInvestorId;
  const canRevolution = isPeriphery && !!team.fdiInvestorId && team.wealth <= REVOLUTION_WEALTH_THRESHOLD;
  const canTariff = isCore;
  const canSynthesize = isCore;

  // Targets for embargo: all teams except self
  const embargoTargets = allTeams.filter((t) => t.id !== team.id);
  // Targets for espionage: teams with higher tech
  const espionageTargets = allTeams.filter((t) => t.id !== team.id && t.techLevel > team.techLevel);
  // Targets for tariff: all teams except self (typically used on Periphery/Semi-P)
  const tariffTargets = allTeams.filter((t) => t.id !== team.id);

  // Check if our team is embargoed, on strike, or tariffed
  const ourEmbargo = status.embargoes.find((e) => e.targetTeamId === team.id);
  const ourStrike = status.strikes.find((s) => s.teamId === team.id);
  const ourTariff = status.tariffs.find((t) => t.targetTeamId === team.id);

  // --- Handlers ---

  const handleEmbargo = async () => {
    if (!targetId || loading) return;
    setLoading("embargo");
    try {
      const res = await fetch("/api/sabotage/embargo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attackerId: team.id, targetId, memberId }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage(data.data.message, "success");
        setTargetId("");
        fetchStatus();
      } else {
        showMessage(data.error, "error");
      }
    } catch {
      showMessage("Network error", "error");
    } finally {
      setLoading(null);
    }
  };

  const handleEspionage = async () => {
    if (!targetId || loading) return;
    setLoading("espionage");
    try {
      const res = await fetch("/api/sabotage/espionage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attackerId: team.id, targetId, memberId }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage(data.data.message, data.data.succeeded ? "success" : "error");
        setTargetId("");
        fetchStatus();
      } else {
        showMessage(data.error, "error");
      }
    } catch {
      showMessage("Network error", "error");
    } finally {
      setLoading(null);
    }
  };

  const handleStrike = async () => {
    if (loading) return;
    setLoading("strike");
    try {
      const res = await fetch("/api/sabotage/strike", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: team.id, memberId }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage(data.data.message, "success");
        fetchStatus();
      } else {
        showMessage(data.error, "error");
      }
    } catch {
      showMessage("Network error", "error");
    } finally {
      setLoading(null);
    }
  };

  const handleRevolution = async () => {
    if (loading) return;
    setLoading("revolution");
    try {
      const res = await fetch("/api/sabotage/revolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: team.id, memberId }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage(data.data.message, "success");
        fetchStatus();
      } else {
        showMessage(data.error, "error");
      }
    } catch {
      showMessage("Network error", "error");
    } finally {
      setLoading(null);
    }
  };

  const handleTariff = async () => {
    if (!targetId || loading) return;
    setLoading("tariff");
    try {
      const res = await fetch("/api/sabotage/tariff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attackerId: team.id, targetId, memberId }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage(data.data.message, "success");
        setTargetId("");
        fetchStatus();
      } else {
        showMessage(data.error, "error");
      }
    } catch {
      showMessage("Network error", "error");
    } finally {
      setLoading(null);
    }
  };

  const handleSynthesis = async () => {
    if (loading || synthCooldown > 0) return;
    setLoading("synthesis");
    try {
      const res = await fetch("/api/sabotage/synthesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: team.id, memberId }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage(data.data.message, "success");
        setSynthCooldown(Math.ceil(SYNTHESIS_COOLDOWN_MS / 1000));
      } else {
        showMessage(data.error, "error");
      }
    } catch {
      showMessage("Network error", "error");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className={`${theme.bgCard} border border-red-700/30 rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <Skull className="h-4 w-4 text-red-400" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-red-400">
          Sabotage
        </h2>
      </div>

      {/* Active effects on our team */}
      {(ourEmbargo || ourStrike || ourTariff) && (
        <div className="mb-3 space-y-1">
          {ourEmbargo && (
            <ActiveEffect
              label={`Embargoed by ${ourEmbargo.imposedByName}`}
              until={ourEmbargo.until}
              color="text-orange-400 bg-orange-900/20"
            />
          )}
          {ourStrike && (
            <ActiveEffect
              label="Worker strike active"
              until={ourStrike.until}
              color="text-yellow-400 bg-yellow-900/20"
            />
          )}
          {ourTariff && (
            <ActiveEffect
              label={`Tariffed by ${ourTariff.imposedByName} (50% sale tax)`}
              until={ourTariff.until}
              color="text-cyan-400 bg-cyan-900/20"
            />
          )}
        </div>
      )}

      <div className="space-y-3">
        {/* --- TARIFF (Core only) --- */}
        {canTariff && (
          <SabotageAction
            icon={<Scale className="h-4 w-4" />}
            title="Trade Tariff"
            description={`Target receives only 50% of sale proceeds for 60s. Costs $${TARIFF_COST}`}
            color="bg-cyan-950/30 border-cyan-900/30 text-cyan-300 hover:bg-cyan-950/50"
            disabled={isFrozen || !!loading || team.wealth < TARIFF_COST}
            loading={loading === "tariff"}
            onAction={handleTariff}
            targetSelector={
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white mt-2"
              >
                <option value="">Select target...</option>
                {tariffTargets.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.tier})</option>
                ))}
              </select>
            }
          />
        )}

        {/* --- SYNTHESIS (Core only) --- */}
        {canSynthesize && (
          <SabotageAction
            icon={<FlaskConical className="h-4 w-4" />}
            title="Resource Synthesis"
            description={`Synthesize 1 raw material for $${SYNTHESIS_COST}. ${synthCooldown > 0 ? `Cooldown: ${synthCooldown}s` : "10s cooldown"}`}
            color="bg-emerald-950/30 border-emerald-900/30 text-emerald-300 hover:bg-emerald-950/50"
            disabled={isFrozen || !!loading || team.wealth < SYNTHESIS_COST || synthCooldown > 0}
            loading={loading === "synthesis"}
            onAction={handleSynthesis}
          />
        )}

        {/* --- EMBARGO (Core / Semi-P) --- */}
        {canEmbargo && (
          <SabotageAction
            icon={<Ban className="h-4 w-4" />}
            title="Trade Embargo"
            description={`Block a team from market for 60s. Costs $${EMBARGO_COST}`}
            color="bg-orange-950/30 border-orange-900/30 text-orange-300 hover:bg-orange-950/50"
            disabled={isFrozen || !!loading || team.wealth < EMBARGO_COST}
            loading={loading === "embargo"}
            onAction={handleEmbargo}
            targetSelector={
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white mt-2"
              >
                <option value="">Select target...</option>
                {embargoTargets.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.tier})</option>
                ))}
              </select>
            }
          />
        )}

        {/* --- ESPIONAGE (Periphery / Semi-P) --- */}
        {canEspionage && (
          <SabotageAction
            icon={<Eye className="h-4 w-4" />}
            title="Espionage"
            description={`${Math.round(ESPIONAGE_SUCCESS_CHANCE * 100)}% chance to steal +1 tech. Fail = $${ESPIONAGE_COST_ON_FAIL} fine`}
            color="bg-violet-950/30 border-violet-900/30 text-violet-300 hover:bg-violet-950/50"
            disabled={isFrozen || !!loading || espionageTargets.length === 0}
            loading={loading === "espionage"}
            onAction={handleEspionage}
            targetSelector={
              espionageTargets.length > 0 ? (
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white mt-2"
                >
                  <option value="">Select target...</option>
                  {espionageTargets.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} (Tech {t.techLevel})</option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-gray-600 mt-1">No teams with higher tech available</p>
              )
            }
          />
        )}

        {/* --- STRIKE (Periphery with FDI) --- */}
        {isPeriphery && (
          <SabotageAction
            icon={<Megaphone className="h-4 w-4" />}
            title="Worker Strike"
            description={canStrike
              ? `Halt your production for 30s. Foreign investor loses $${STRIKE_INVESTOR_PENALTY}`
              : "Requires an FDI investor on your team"
            }
            color="bg-yellow-950/30 border-yellow-900/30 text-yellow-300 hover:bg-yellow-950/50"
            disabled={isFrozen || !!loading || !canStrike || !!ourStrike}
            loading={loading === "strike"}
            onAction={handleStrike}
          />
        )}

        {/* --- REVOLUTION (Periphery, desperate) --- */}
        {isPeriphery && team.fdiInvestorId && (
          <SabotageAction
            icon={<Flame className="h-4 w-4" />}
            title="Revolution"
            description={canRevolution
              ? "Break FDI link! Costs half your wealth and all tech."
              : `Requires wealth <= $${REVOLUTION_WEALTH_THRESHOLD} (you have $${team.wealth})`
            }
            color="bg-red-950/30 border-red-900/30 text-red-300 hover:bg-red-950/50"
            disabled={isFrozen || !!loading || !canRevolution}
            loading={loading === "revolution"}
            onAction={handleRevolution}
          />
        )}
      </div>

      {/* Status message */}
      {message && (
        <div className={cn(
          "mt-3 text-sm text-center rounded-lg py-2",
          message.type === "success" ? "text-green-300 bg-green-900/20" : "text-red-300 bg-red-900/20"
        )}>
          {message.text}
        </div>
      )}
    </div>
  );
}

// --- Sub-components ---

function SabotageAction({
  icon,
  title,
  description,
  color,
  disabled,
  loading,
  onAction,
  targetSelector,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  disabled: boolean;
  loading: boolean;
  onAction: () => void;
  targetSelector?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn("rounded-lg border p-3 transition-all", color, disabled && "opacity-50")}>
      <button
        onClick={() => {
          if (targetSelector) {
            setExpanded(!expanded);
          } else {
            onAction();
          }
        }}
        disabled={disabled}
        className="w-full text-left disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
          <span className="font-medium text-sm">{title}</span>
        </div>
        <p className="text-xs opacity-60 mt-1">{description}</p>
      </button>

      {expanded && targetSelector && (
        <div className="mt-2">
          {targetSelector}
          <button
            onClick={onAction}
            disabled={disabled || loading}
            className="mt-2 w-full bg-red-600 hover:bg-red-500 text-white rounded-lg py-2 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : `Execute ${title}`}
          </button>
        </div>
      )}
    </div>
  );
}

function ActiveEffect({ label, until, color }: { label: string; until: number; color: string }) {
  const [remaining, setRemaining] = useState(Math.max(0, Math.ceil((until - Date.now()) / 1000)));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(Math.max(0, Math.ceil((until - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [until]);

  if (remaining <= 0) return null;

  return (
    <div className={cn("rounded-lg px-3 py-1.5 text-xs font-medium flex items-center justify-between", color)}>
      <span>{label}</span>
      <span className="font-mono">{remaining}s</span>
    </div>
  );
}
