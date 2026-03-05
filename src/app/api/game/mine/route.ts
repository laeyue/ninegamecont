import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sseBroadcaster, SSE_EVENTS } from "@/lib/sse";
import { canMine, getMineCooldownMs, MINE_WEALTH_BONUS } from "@/lib/game-config";
import { sabotageState } from "@/lib/sabotage-state";
import { checkGameActive, checkMemberRole } from "@/lib/game-guards";
import type { MineRequest } from "@/types";

export const dynamic = 'force-dynamic';

// In-memory cooldown tracking per player
const globalForMine = globalThis as unknown as { lastMineTime: Map<string, number> | undefined };
const lastMineTime = globalForMine.lastMineTime ?? new Map<string, number>();
if (process.env.NODE_ENV !== "production") globalForMine.lastMineTime = lastMineTime;

export async function POST(request: NextRequest) {
  try {
    const body: MineRequest = await request.json();
    const { teamId, memberId } = body;

    if (!teamId || !memberId) {
      return NextResponse.json(
        { success: false, error: "teamId and memberId are required" },
        { status: 400 }
      );
    }

    // Check game is active (not frozen, not pre-game)
    const gameCheck = await checkGameActive();
    if (gameCheck) return gameCheck;

    // Check role
    const roleCheck = checkMemberRole(memberId, "MINER");
    if (roleCheck) return roleCheck;

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

    // Enforce cooldown (server-side per player)
    const cooldownMs = getMineCooldownMs(team.tier);
    const now = Date.now();
    const lastTime = lastMineTime.get(memberId) ?? 0;
    const elapsed = now - lastTime;

    if (elapsed < cooldownMs) {
      const remaining = Math.ceil((cooldownMs - elapsed) / 1000);
      return NextResponse.json(
        { success: false, error: `Cooldown: ${remaining}s remaining` },
        { status: 429 }
      );
    }

    // Record cooldown
    lastMineTime.set(memberId, now);

    // Calculate mine wealth bonus (resource export revenue)
    const wealthBonus = MINE_WEALTH_BONUS[team.tier] ?? 0;

    // Update team: +1 raw material + direct wealth from resource exports
    const updated = await prisma.team.update({
      where: { id: teamId },
      data: {
        rawMaterials: { increment: 1 },
        ...(wealthBonus > 0 ? { wealth: { increment: wealthBonus } } : {}),
      },
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
