// In-memory member registry — no DB needed
// Roles: Miner (mine + sell on market), Manufacturer (manufacture + buy on market), Treasurer (read-only)

export type MemberRole = "MINER" | "MANUFACTURER" | "SABOTEUR";

export interface Member {
  memberId: string;   // uuid generated client-side stored in localStorage
  teamId: string;
  name: string;
  role: MemberRole;
  joinedAt: number;   // Date.now()
}

// Round-robin role pools per tier
// CORE has no miners — roles are MANUFACTURER + SABOTEUR
// SEMI_PERIPHERY / PERIPHERY — MINER + MANUFACTURER + SABOTEUR
// We assign roles in this order as members join; extras get the last role

const ROLE_ORDER_MINE_CAPABLE: MemberRole[] = ["MINER", "MANUFACTURER", "SABOTEUR"];
const ROLE_ORDER_CORE: MemberRole[] = ["MANUFACTURER", "SABOTEUR"];

class MemberRegistry {
  // teamId -> memberId -> Member
  private teams = new Map<string, Map<string, Member>>();

  private getOrCreateTeam(teamId: string): Map<string, Member> {
    if (!this.teams.has(teamId)) {
      this.teams.set(teamId, new Map());
    }
    return this.teams.get(teamId)!;
  }

  getTeamMembers(teamId: string): Member[] {
    return Array.from(this.getOrCreateTeam(teamId).values()).sort(
      (a, b) => a.joinedAt - b.joinedAt
    );
  }

  getAllMembers(): Record<string, Member[]> {
    const result: Record<string, Member[]> = {};
    for (const [teamId] of this.teams) {
      result[teamId] = this.getTeamMembers(teamId);
    }
    return result;
  }

  getMember(memberId: string): Member | null {
    for (const teamMap of this.teams.values()) {
      if (teamMap.has(memberId)) return teamMap.get(memberId)!;
    }
    return null;
  }

  join(memberId: string, teamId: string, name: string, isCoreTeam: boolean): Member {
    const teamMap = this.getOrCreateTeam(teamId);

    // If this memberId already exists (reconnect), keep their role but update name
    if (teamMap.has(memberId)) {
      const existing = teamMap.get(memberId)!;
      const updated = { ...existing, name };
      teamMap.set(memberId, updated);
      return updated;
    }

    // Assign next available role (round-robin)
    const members = this.getTeamMembers(teamId);
    const roleOrder = isCoreTeam ? ROLE_ORDER_CORE : ROLE_ORDER_MINE_CAPABLE;
    const role = roleOrder[members.length % roleOrder.length];

    const member: Member = { memberId, teamId, name, role, joinedAt: Date.now() };
    teamMap.set(memberId, member);
    return member;
  }

  leave(memberId: string): void {
    for (const teamMap of this.teams.values()) {
      if (teamMap.has(memberId)) {
        teamMap.delete(memberId);
        return;
      }
    }
  }

  /** Clear all members (used during game reset) */
  clear(): void {
    this.teams.clear();
  }

  // Rotate roles within a team: shift everyone one slot forward in the role order
  rotateRoles(teamId: string, isCoreTeam: boolean): Member[] {
    const members = this.getTeamMembers(teamId);
    if (members.length === 0) return [];

    const roleOrder = isCoreTeam ? ROLE_ORDER_CORE : ROLE_ORDER_MINE_CAPABLE;
    // Reassign roles cycling through roleOrder by position
    const teamMap = this.getOrCreateTeam(teamId);

    // Find current index of first member's role, then shift by 1
    const currentFirstRole = members[0].role;
    const currentIdx = roleOrder.indexOf(currentFirstRole);
    const shift = currentIdx === -1 ? 1 : 1; // always shift by 1

    members.forEach((member, i) => {
      const newRoleIdx = (i + (currentIdx === -1 ? 0 : currentIdx) + shift) % roleOrder.length;
      const updated = { ...member, role: roleOrder[newRoleIdx] };
      teamMap.set(member.memberId, updated);
    });

    return this.getTeamMembers(teamId);
  }
}

// Singleton
const globalForRegistry = globalThis as unknown as {
  memberRegistry: MemberRegistry | undefined;
};

export const memberRegistry =
  globalForRegistry.memberRegistry ?? new MemberRegistry();

if (process.env.NODE_ENV !== "production") {
  globalForRegistry.memberRegistry = memberRegistry;
}
