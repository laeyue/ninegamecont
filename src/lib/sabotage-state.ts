// In-memory sabotage state — no DB needed
// Tracks active embargoes and strikes with expiry times

export interface EmbargoEntry {
  targetTeamId: string;
  imposedByTeamId: string;
  imposedByName: string;
  until: number; // Date.now() + duration
}

export interface StrikeEntry {
  teamId: string;
  teamName: string;
  until: number; // Date.now() + duration
}

export interface TariffEntry {
  targetTeamId: string;
  imposedByTeamId: string;
  imposedByName: string;
  rate: number; // fraction of sale price taken (e.g. 0.5 = 50%)
  until: number; // Date.now() + duration
}

// Sabotage cooldown per team (prevent spam)
const SABOTAGE_COOLDOWN_MS = 15_000; // 15s between any sabotage action per team

class SabotageState {
  private embargoes = new Map<string, EmbargoEntry>(); // targetTeamId -> entry
  private strikes = new Map<string, StrikeEntry>();    // teamId -> entry
  private tariffs = new Map<string, TariffEntry>();    // targetTeamId -> entry
  private synthesisCooldowns = new Map<string, number>(); // memberId -> timestamp
  private lastSabotageTime = new Map<string, number>(); // attackerTeamId -> timestamp

  // --- Embargo ---

  addEmbargo(targetTeamId: string, imposedByTeamId: string, imposedByName: string, durationMs: number): EmbargoEntry {
    const entry: EmbargoEntry = {
      targetTeamId,
      imposedByTeamId,
      imposedByName,
      until: Date.now() + durationMs,
    };
    this.embargoes.set(targetTeamId, entry);
    this.lastSabotageTime.set(imposedByTeamId, Date.now());
    return entry;
  }

  isEmbargoed(teamId: string): EmbargoEntry | null {
    const entry = this.embargoes.get(teamId);
    if (!entry) return null;
    if (Date.now() > entry.until) {
      this.embargoes.delete(teamId);
      return null;
    }
    return entry;
  }

  // --- Strike ---

  addStrike(teamId: string, teamName: string, durationMs: number): StrikeEntry {
    const entry: StrikeEntry = { teamId, teamName, until: Date.now() + durationMs };
    this.strikes.set(teamId, entry);
    this.lastSabotageTime.set(teamId, Date.now());
    return entry;
  }

  isOnStrike(teamId: string): StrikeEntry | null {
    const entry = this.strikes.get(teamId);
    if (!entry) return null;
    if (Date.now() > entry.until) {
      this.strikes.delete(teamId);
      return null;
    }
    return entry;
  }

  // --- Cooldown ---

  canSabotage(teamId: string): { allowed: boolean; remainingMs: number } {
    const last = this.lastSabotageTime.get(teamId) ?? 0;
    const elapsed = Date.now() - last;
    if (elapsed >= SABOTAGE_COOLDOWN_MS) return { allowed: true, remainingMs: 0 };
    return { allowed: false, remainingMs: SABOTAGE_COOLDOWN_MS - elapsed };
  }

  recordSabotage(teamId: string): void {
    this.lastSabotageTime.set(teamId, Date.now());
  }

  // --- Tariff ---

  addTariff(targetTeamId: string, imposedByTeamId: string, imposedByName: string, rate: number, durationMs: number): TariffEntry {
    const entry: TariffEntry = {
      targetTeamId,
      imposedByTeamId,
      imposedByName,
      rate,
      until: Date.now() + durationMs,
    };
    this.tariffs.set(targetTeamId, entry);
    this.lastSabotageTime.set(imposedByTeamId, Date.now());
    return entry;
  }

  getTariff(teamId: string): TariffEntry | null {
    const entry = this.tariffs.get(teamId);
    if (!entry) return null;
    if (Date.now() > entry.until) {
      this.tariffs.delete(teamId);
      return null;
    }
    return entry;
  }

  getActiveTariffs(): TariffEntry[] {
    const now = Date.now();
    const active: TariffEntry[] = [];
    for (const [teamId, entry] of this.tariffs) {
      if (now > entry.until) {
        this.tariffs.delete(teamId);
      } else {
        active.push(entry);
      }
    }
    return active;
  }

  // --- Synthesis cooldown (per-player) ---

  canSynthesize(memberId: string, cooldownMs: number): { allowed: boolean; remainingMs: number } {
    const last = this.synthesisCooldowns.get(memberId) ?? 0;
    const elapsed = Date.now() - last;
    if (elapsed >= cooldownMs) return { allowed: true, remainingMs: 0 };
    return { allowed: false, remainingMs: cooldownMs - elapsed };
  }

  recordSynthesis(memberId: string): void {
    this.synthesisCooldowns.set(memberId, Date.now());
  }

  // --- Status (for /api/sabotage/status) ---

  getActiveEmbargoes(): EmbargoEntry[] {
    const now = Date.now();
    const active: EmbargoEntry[] = [];
    for (const [teamId, entry] of this.embargoes) {
      if (now > entry.until) {
        this.embargoes.delete(teamId);
      } else {
        active.push(entry);
      }
    }
    return active;
  }

  getActiveStrikes(): StrikeEntry[] {
    const now = Date.now();
    const active: StrikeEntry[] = [];
    for (const [teamId, entry] of this.strikes) {
      if (now > entry.until) {
        this.strikes.delete(teamId);
      } else {
        active.push(entry);
      }
    }
    return active;
  }

  // --- Reset ---

  clear(): void {
    this.embargoes.clear();
    this.strikes.clear();
    this.tariffs.clear();
    this.synthesisCooldowns.clear();
    this.lastSabotageTime.clear();
  }
}

// Singleton — survives hot reloads in dev
const globalForSabotage = globalThis as unknown as {
  sabotageState: SabotageState | undefined;
};

export const sabotageState =
  globalForSabotage.sabotageState ?? new SabotageState();

if (process.env.NODE_ENV !== "production") {
  globalForSabotage.sabotageState = sabotageState;
}
