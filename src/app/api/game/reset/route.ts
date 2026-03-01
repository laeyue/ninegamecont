import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sseBroadcaster, SSE_EVENTS } from "@/lib/sse";
import { TIER_DEFAULTS, DEFAULT_TIMER_SECONDS } from "@/lib/game-config";
import { sabotageState } from "@/lib/sabotage-state";
import { memberRegistry } from "@/lib/member-registry";
import { Tier } from "@prisma/client";

export const dynamic = 'force-dynamic';

const TEAM_TIERS: { name: string; tier: Tier }[] = [
  { name: "Group 1", tier: Tier.CORE },
  { name: "Group 2", tier: Tier.CORE },
  { name: "Group 3", tier: Tier.SEMI_PERIPHERY },
  { name: "Group 4", tier: Tier.SEMI_PERIPHERY },
  { name: "Group 5", tier: Tier.SEMI_PERIPHERY },
  { name: "Group 6", tier: Tier.PERIPHERY },
  { name: "Group 7", tier: Tier.PERIPHERY },
  { name: "Group 8", tier: Tier.PERIPHERY },
  { name: "Group 9", tier: Tier.PERIPHERY },
  { name: "Group 10", tier: Tier.PERIPHERY },
];

export async function POST() {
  try {
    // Clear all orders and logs
    await prisma.marketOrder.deleteMany();
    await prisma.gameEventLog.deleteMany();

    // Reset all teams to starting state
    for (const { name, tier } of TEAM_TIERS) {
      const defaults = TIER_DEFAULTS[tier];
      await prisma.team.upsert({
        where: { name },
        update: {
          tier,
          wealth: defaults.wealth,
          rawMaterials: defaults.rawMaterials,
          techLevel: defaults.techLevel,
          fdiInvestorId: null,
        },
        create: {
          name,
          tier,
          wealth: defaults.wealth,
          rawMaterials: defaults.rawMaterials,
          techLevel: defaults.techLevel,
        },
      });
    }

    // Reset game state
    await prisma.gameState.upsert({
      where: { id: "singleton" },
      update: {
        timerSeconds: DEFAULT_TIMER_SECONDS,
        timerRunning: false,
        timerEndsAt: null,
        gameFrozen: false,
      },
      create: {
        id: "singleton",
        timerSeconds: DEFAULT_TIMER_SECONDS,
        timerRunning: false,
        gameFrozen: false,
      },
    });

    // Clear sabotage state (embargoes, strikes, cooldowns)
    sabotageState.clear();

    // Clear member registry (roles, joined players)
    memberRegistry.clear();

    // Broadcast reset
    sseBroadcaster.emit(SSE_EVENTS.GAME_RESET, {});

    return NextResponse.json({ success: true, data: { message: "Game reset successfully" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("POST /api/game/reset error:", message, error);
    return NextResponse.json(
      { success: false, error: `Failed to reset game: ${message}` },
      { status: 500 }
    );
  }
}
