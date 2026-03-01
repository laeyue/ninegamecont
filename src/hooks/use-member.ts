"use client";

import { useState, useEffect, useCallback } from "react";
import type { MemberRole, Member } from "@/lib/member-registry";

// Generate a stable client-side UUID stored in localStorage
function getOrCreateMemberId(): string {
  const key = "memberId";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export function useMember(teamId: string | null) {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On mount, restore member from localStorage and re-validate with server.
  // If the server restarted (in-memory registry cleared), this silently re-joins
  // so the player is tracked again without needing to re-enter their name.
  useEffect(() => {
    if (!teamId) return;
    const stored = localStorage.getItem(`member:${teamId}`);
    if (!stored) return;

    let parsed: Member;
    try {
      parsed = JSON.parse(stored);
    } catch {
      localStorage.removeItem(`member:${teamId}`);
      return;
    }

    // Show stored state immediately so UI doesn't flash
    setMember(parsed);

    // Silently re-join on server to ensure in-memory registry has this member
    const memberId = getOrCreateMemberId();
    fetch("/api/members/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, teamId, name: parsed.name }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const m: Member = data.data.member;
          setMember(m);
          localStorage.setItem(`member:${teamId}`, JSON.stringify(m));
        }
      })
      .catch(() => {
        // Server unreachable — keep showing cached state
      });
  }, [teamId]);

  // Listen for role rotation via SSE — parent passes updatedMembers, we find ours
  const applyRoleRotation = useCallback(
    (members: Member[]) => {
      if (!member) return;
      const updated = members.find((m) => m.memberId === member.memberId);
      if (updated) {
        setMember(updated);
        if (teamId) localStorage.setItem(`member:${teamId}`, JSON.stringify(updated));
      }
    },
    [member, teamId]
  );

  const join = useCallback(
    async (name: string) => {
      if (!teamId) return;
      setLoading(true);
      setError(null);

      const memberId = getOrCreateMemberId();

      try {
        const res = await fetch("/api/members/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId, teamId, name }),
        });
        const data = await res.json();
        if (data.success) {
          const m: Member = data.data.member;
          setMember(m);
          localStorage.setItem(`member:${teamId}`, JSON.stringify(m));
        } else {
          setError(data.error || "Failed to join");
        }
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    },
    [teamId]
  );

  const leave = useCallback(async () => {
    if (!member || !teamId) return;
    localStorage.removeItem(`member:${teamId}`);
    setMember(null);
    // Fire-and-forget
    fetch("/api/members/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: member.memberId }),
    }).catch(() => {});
  }, [member, teamId]);

  return { member, loading, error, join, leave, applyRoleRotation };
}

export type { MemberRole, Member };
