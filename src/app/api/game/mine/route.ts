import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sseBroadcaster, SSE_EVENTS } from "@/lib/sse";
import { canMine, getMineCooldownMs } from "@/lib/game-config";
import { sabotageState } from "@/lib/sabotage-state";
import type { MineRequest } from "@/types";

export const dynamic = 'force-dynamic';

// In-memory cooldown tracking to prevent DB thrashing
const lastMineTime = new Map<string, number>();

export async function POST(request: NextRequest) {
  try {
    const body: MineRequest = await request.json();
    const { teamId } = body;

    if (!teamId) {
      return NextResponse.json(
        { success: false, error: "teamId is required" },
        { status: 400 }
      );
    }

    // Check game state
    const gameState = await prisma.gameState.findUnique({
      where: { id: "singleton" },
    });
    if (gameState?.gameFrozen) {
      return NextResponse.json(
        { success: false, error: "Game is frozen" },
        { status: 403 }
      );
    }

    // Fetch team
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return NextResponse.json(
        { success: false, error: "Team not found" },
        { status: 404 }
      );
    }

    // Check tier allows mining
    if (!canMine(team.tier)) {
      return NextResponse.json(
        { success: false, error: "Your tier cannot mine" },
        { status: 403 }
      );
    }

    // Check if team is on strike
    const strike = sabotageState.isOnStrike(teamId);
    if (strike) {
      const remaining = Math.ceil((strike.until - Date.now()) / 1000);
      return NextResponse.json(
        { success: false, error: `Worker strike in progress (${remaining}s remaining)` },
        { status: 403 }
      );
    }

    // Enforce cooldown (server-side debounce)
    const cooldownMs = getMineCooldownMs(team.tier);
    const now = Date.now();
    const lastTime = lastMineTime.get(teamId) ?? 0;
    const elapsed = now - lastTime;

    if (elapsed < cooldownMs) {
      const remaining = Math.ceil((cooldownMs - elapsed) / 1000);
      return NextResponse.json(
        { success: false, error: `Cooldown: ${remaining}s remaining` },
        { status: 429 }
      );
    }

    // Record cooldown
    lastMineTime.set(teamId, now);

    // Update team
    const updated = await prisma.team.update({
      where: { id: teamId },
      data: { rawMaterials: { increment: 1 } },
    });

    // Broadcast update
    sseBroadcaster.emit(SSE_EVENTS.TEAM_UPDATE, { team: updated });

    return NextResponse.json({ success: true, data: { team: updated } });
  } catch (error) {
    console.error("POST /api/game/mine error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to mine" },
      { status: 500 }
    );
  }
}
