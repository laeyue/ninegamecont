"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, RefreshCw, Loader2 } from "lucide-react";
import type { TeamData } from "@/types";
import type { Member } from "@/lib/member-registry";

interface MemberPanelProps {
  teams: TeamData[];
}

const ROLE_COLORS: Record<string, string> = {
  MINER: "text-yellow-400 bg-yellow-900/20 border-yellow-800/30",
  MANUFACTURER: "text-blue-400 bg-blue-900/20 border-blue-800/30",
  SABOTEUR: "text-red-400 bg-red-900/20 border-red-800/30",
};

const ROLE_LABELS: Record<string, string> = {
  MINER: "Miner",
  MANUFACTURER: "Manufacturer",
  SABOTEUR: "Saboteur",
};

export function MemberPanel({ teams }: MemberPanelProps) {
  const [membersByTeam, setMembersByTeam] = useState<Record<string, Member[]>>({});
  const [rotating, setRotating] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/members/list");
      const data = await res.json();
      if (data.success) {
        setMembersByTeam(data.data.members);
      }
    } catch {
      // silently ignore — poll will retry
    }
  }, []);

  // Poll every 5 seconds
  useEffect(() => {
    fetchMembers();
    const interval = setInterval(fetchMembers, 5000);
    return () => clearInterval(interval);
  }, [fetchMembers]);

  const handleRotate = async (teamId: string) => {
    setRotating(teamId);
    setMessage(null);
    try {
      const res = await fetch("/api/members/rotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      const data = await res.json();
      if (data.success) {
        // Update local state immediately with returned members
        setMembersByTeam((prev) => ({ ...prev, [teamId]: data.data.members }));
        setMessage(`Roles rotated for ${teams.find((t) => t.id === teamId)?.name ?? teamId}`);
        setTimeout(() => setMessage(null), 2500);
      } else {
        setMessage(data.error ?? "Rotation failed");
      }
    } catch {
      setMessage("Network error");
    } finally {
      setRotating(null);
    }
  };

  // Only show teams that have at least one member, but list all teams in order
  const activeTeams = teams.filter((t) => (membersByTeam[t.id]?.length ?? 0) > 0);
  const totalConnected = Object.values(membersByTeam).reduce(
    (sum, members) => sum + members.length,
    0
  );

  return (
    <div className="bg-gray-900/50 border border-gray-700/30 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-bold text-gray-200">Connected Members</h2>
        </div>
        <span className="text-xs text-gray-500 bg-gray-800 rounded-full px-2 py-0.5">
          {totalConnected} online
        </span>
      </div>

      {activeTeams.length === 0 ? (
        <p className="text-xs text-gray-600 text-center py-4">
          No players connected yet
        </p>
      ) : (
        <div className="space-y-3">
          {activeTeams.map((team) => {
            const members = membersByTeam[team.id] ?? [];
            return (
              <div
                key={team.id}
                className="rounded-lg border border-gray-800 bg-gray-900/30 p-3"
              >
                {/* Team row */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-300">{team.name}</span>
                  <button
                    onClick={() => handleRotate(team.id)}
                    disabled={rotating === team.id || members.length === 0}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Rotate roles for this team"
                  >
                    {rotating === team.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    Rotate
                  </button>
                </div>

                {/* Member list */}
                <div className="space-y-1">
                  {members.map((member) => (
                    <div
                      key={member.memberId}
                      className="flex items-center justify-between"
                    >
                      <span className="text-xs text-gray-400 truncate max-w-[120px]">
                        {member.name}
                      </span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                          ROLE_COLORS[member.role] ?? "text-gray-400"
                        }`}
                      >
                        {ROLE_LABELS[member.role] ?? member.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Status message */}
      {message && (
        <div className="mt-3 text-xs text-center text-gray-300 bg-black/20 rounded-lg py-2">
          {message}
        </div>
      )}
    </div>
  );
}
