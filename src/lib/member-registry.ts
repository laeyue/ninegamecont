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

    const members = this.getTeamMembers(teamId);
    const hasSaboteur = members.some(m => m.role === "SABOTEUR");

    let role: MemberRole;
    if (!hasSaboteur) {
      if (isCoreTeam) {
        // Priority: MANUFACTURER, then SABOTEUR
        const hasManu = members.some(m => m.role === "MANUFACTURER");
        role = hasManu ? "SABOTEUR" : "MANUFACTURER";
      } else {
        // Priority: MINER, then MANUFACTURER, then SABOTEUR
        const hasMiner = members.some(m => m.role === "MINER");
        const hasManu = members.some(m => m.role === "MANUFACTURER");
        if (!hasMiner) role = "MINER";
        else if (!hasManu) role = "MANUFACTURER";
        else role = "SABOTEUR";
      }
    } else {
      if (isCoreTeam) {
        role = "MANUFACTURER";
      } else {
        const minCount = members.filter(m => m.role === "MINER").length;
        const manCount = members.filter(m => m.role === "MANUFACTURER").length;
        role = minCount <= manCount ? "MINER" : "MANUFACTURER";
      }
    }

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

  // Rotate roles within a team: shift the *roles* among the existing *members*
  rotateRoles(teamId: string, _isCoreTeam: boolean): Member[] {
    const members = this.getTeamMembers(teamId);
    if (members.length <= 1) return members;

    const teamMap = this.getOrCreateTeam(teamId);

    // Extract current roles in join order
    const roles = members.map(m => m.role);

    // Shift right by 1
    const lastRole = roles.pop()!;
    roles.unshift(lastRole);

    // Assign back
    members.forEach((member, i) => {
      const updated = { ...member, role: roles[i] };
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
