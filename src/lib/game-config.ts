import { Tier } from "@prisma/client";

// ---------- Tier starting values ----------
export const TIER_DEFAULTS: Record<
  Tier,
  { wealth: number; rawMaterials: number; techLevel: number }
> = {
  [Tier.CORE]: { wealth: 500, rawMaterials: 0, techLevel: 3 },
  [Tier.SEMI_PERIPHERY]: { wealth: 200, rawMaterials: 10, techLevel: 1 },
  [Tier.PERIPHERY]: { wealth: 50, rawMaterials: 30, techLevel: 0 },
};

// ---------- Manufacture outputs ----------
export const MANUFACTURE_OUTPUT: Partial<Record<Tier, number>> = {
  [Tier.CORE]: 80,
  [Tier.SEMI_PERIPHERY]: 30,
};

// ---------- Mine cooldowns (milliseconds) ----------
export const MINE_COOLDOWN_MS: Partial<Record<Tier, number>> = {
  [Tier.PERIPHERY]: 3000,
  [Tier.SEMI_PERIPHERY]: 5000,
};

// ---------- Manufacture cooldowns (milliseconds) ----------
export const MANUFACTURE_COOLDOWN_MS: Partial<Record<Tier, number>> = {
  [Tier.CORE]: 5000,
  [Tier.SEMI_PERIPHERY]: 8000,
};

// ---------- FDI tax rate ----------
export const FDI_TAX_RATE = 0.5;

// ---------- Default game timer (seconds) ----------
export const DEFAULT_TIMER_SECONDS = 1200; // 20 minutes

// ---------- Sabotage costs & settings ----------
export const EMBARGO_COST = 50;
export const EMBARGO_DURATION_MS = 60_000; // 60 seconds
export const ESPIONAGE_COST_ON_FAIL = 40;
export const ESPIONAGE_SUCCESS_CHANCE = 0.25; // 25%
export const STRIKE_DURATION_MS = 30_000; // 30 seconds
export const STRIKE_INVESTOR_PENALTY = 30; // Core investor loses $30
export const REVOLUTION_WEALTH_THRESHOLD = 20; // wealth must be <= this

// ---------- Core-exclusive sabotage ----------
export const TARIFF_COST = 40;
export const TARIFF_DURATION_MS = 60_000; // 60 seconds
export const TARIFF_RATE = 0.5; // 50% of sale price taken from seller
export const SYNTHESIS_COST = 40;
export const SYNTHESIS_COOLDOWN_MS = 10_000; // 10 seconds per player

// ---------- Tier display info ----------
export const TIER_LABELS: Record<Tier, string> = {
  [Tier.CORE]: "Core",
  [Tier.SEMI_PERIPHERY]: "Semi-Periphery",
  [Tier.PERIPHERY]: "Periphery",
};

// Abilities per tier
export function canMine(tier: Tier): boolean {
  return tier === Tier.PERIPHERY || tier === Tier.SEMI_PERIPHERY;
}

export function canManufacture(tier: Tier, techLevel: number): boolean {
  return techLevel >= 1 && (tier === Tier.CORE || tier === Tier.SEMI_PERIPHERY || techLevel >= 1);
}

export function getMineCooldownMs(tier: Tier): number {
  return MINE_COOLDOWN_MS[tier] ?? 5000;
}

export function getManufactureOutput(tier: Tier): number {
  return MANUFACTURE_OUTPUT[tier] ?? 30;
}

export function getManufactureCooldownMs(tier: Tier): number {
  return MANUFACTURE_COOLDOWN_MS[tier] ?? 5000;
}
