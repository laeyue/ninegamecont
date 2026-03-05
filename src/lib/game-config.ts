import { Tier } from "@prisma/client";

// ---------- Tier starting values ----------
export const TIER_DEFAULTS: Record<
  Tier,
  { wealth: number; rawMaterials: number; techLevel: number }
> = {
  [Tier.CORE]: { wealth: 500, rawMaterials: 0, techLevel: 3 },
  [Tier.SEMI_PERIPHERY]: { wealth: 200, rawMaterials: 15, techLevel: 1 },
  [Tier.PERIPHERY]: { wealth: 100, rawMaterials: 30, techLevel: 0 },
};

// ---------- Manufacture outputs ----------
export const MANUFACTURE_OUTPUT: Partial<Record<Tier, number>> = {
  [Tier.CORE]: 50,
  [Tier.SEMI_PERIPHERY]: 35,
  [Tier.PERIPHERY]: 35, // Cheap labor advantage when industrialized via FDI
};

// ---------- Mine wealth bonus (direct income from resource exports) ----------
export const MINE_WEALTH_BONUS: Partial<Record<Tier, number>> = {
  [Tier.PERIPHERY]: 5,       // Resource-rich nations earn export revenue
  [Tier.SEMI_PERIPHERY]: 4,  // Buffed resource income
};

// ---------- Mine cooldowns (milliseconds) ----------
export const MINE_COOLDOWN_MS: Partial<Record<Tier, number>> = {
  [Tier.PERIPHERY]: 2000,
  [Tier.SEMI_PERIPHERY]: 6000,
};

// ---------- Manufacture cooldowns (milliseconds) ----------
export const MANUFACTURE_COOLDOWN_MS: Partial<Record<Tier, number>> = {
  [Tier.CORE]: 6000,
  [Tier.SEMI_PERIPHERY]: 10000,
  [Tier.PERIPHERY]: 8000, // Cheap labor = faster factories when industrialized
};

// ---------- FDI tax rate ----------
export const FDI_TAX_RATE = 0.2;

// ---------- Default game timer (seconds) ----------
export const DEFAULT_TIMER_SECONDS = 1200; // 20 minutes

// ---------- Sabotage costs & settings ----------
export const EMBARGO_COST = 50;
export const EMBARGO_DURATION_MS = 60_000; // 60 seconds
export const ESPIONAGE_COST_ON_FAIL = 25;
export const ESPIONAGE_SUCCESS_CHANCE = 0.10; // 10%
export const STRIKE_DURATION_MS = 30_000; // 30 seconds
export const STRIKE_INVESTOR_PENALTY = 50; // Core investor loses $50
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

export function getManufactureOutput(tier: Tier, techLevel: number): number {
  // Higher tech unlocks higher-tier manufacturing (China model)
  // Tech 3 → Core-level output, Tech 2 → Semi-level output
  if (techLevel >= 3) return MANUFACTURE_OUTPUT[Tier.CORE] ?? 50;
  if (techLevel >= 2) return MANUFACTURE_OUTPUT[Tier.SEMI_PERIPHERY] ?? 30;
  return MANUFACTURE_OUTPUT[tier] ?? 30;
}

export function getManufactureCooldownMs(tier: Tier): number {
  return MANUFACTURE_COOLDOWN_MS[tier] ?? 5000;
}
