import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sseBroadcaster, SSE_EVENTS } from "@/lib/sse";
import { sabotageState } from "@/lib/sabotage-state";
import { SYNTHESIS_COST, SYNTHESIS_COOLDOWN_MS } from "@/lib/game-config";
import { checkGameActive, checkMemberRole } from "@/lib/game-guards";
import { Tier } from "@prisma/client";

export const dynamic = "force-dynamic";

// POST { teamId, memberId }
// Core-exclusive: spend $40 to synthesize 1 raw material, bypassing the market.
// 10s cooldown per player (memberId).
export async function POST(req: NextRequest) {
  try {
    const { teamId, memberId } = await req.json();

    if (!teamId) {
      return NextResponse.json({ success: false, error: "teamId is required" }, { status: 400 });
    }

    // Check game is active (not frozen, not pre-game)
    const gameCheck = await checkGameActive();
    if (gameCheck) return gameCheck;

    // Check role (only SABOTEUR can use synthesis)
    if (memberId) {
      const roleCheck = checkMemberRole(memberId, "SABOTEUR");
      if (roleCheck) return roleCheck;
    }

    // Check per-player synthesis cooldown
    if (memberId) {
      const cd = sabotageState.canSynthesize(memberId, SYNTHESIS_COOLDOWN_MS);
      if (!cd.allowed) {
        return NextResponse.json(
          { success: false, error: `Synthesis cooldown: ${Math.ceil(cd.remainingMs / 1000)}s remaining` },
          { status: 429 }
        );
      }
    }

    // Record synthesis cooldown BEFORE the async DB transaction to prevent TOCTOU race
    if (memberId) {
      sabotageState.recordSynthesis(memberId);
    }

    const result = await prisma.$transaction(async (tx) => {
      const team = await tx.team.findUnique({ where: { id: teamId } });
      if (!team) throw new Error("Team not found");

      // Only Core can synthesize
      if (team.tier !== Tier.CORE) {
        throw new Error("Only Core nations can synthesize resources");
      }

      // Atomic conditional deduction — only deducts if wealth >= cost
      // Also increments rawMaterials in the same atomic operation.
      // Prevents TOCTOU race where concurrent requests both pass a check and both deduct.
      const deductResult: { id: string }[] = await tx.$queryRawUnsafe(
        `UPDATE "teams"
         SET "wealth" = "wealth" - $1,
             "raw_materials" = "raw_materials" + 1
         WHERE "id" = $2 AND "wealth" >= $1
         RETURNING "id"`,
        SYNTHESIS_COST,
        teamId
      );
      if (deductResult.length === 0) {
        throw new Error(`Not enough wealth. Need $${SYNTHESIS_COST}, have $${team.wealth}`);
      }

      // Re-fetch team for broadcasting
      const updatedTeam = await tx.team.findUnique({ where: { id: teamId } });
      if (!updatedTeam) throw new Error("Team not found after update");

      // Log
      const log = await tx.gameEventLog.create({
        data: { message: `${team.name} synthesized 1 raw material for $${SYNTHESIS_COST} (RESOURCE SYNTHESIS)` },
      });

      return { updatedTeam, log };
    });

    // Broadcast
    sseBroadcaster.emit(SSE_EVENTS.TEAM_UPDATE, { team: result.updatedTeam });
    sseBroadcaster.emit(SSE_EVENTS.EVENT_LOG, { log: result.log });
    sseBroadcaster.emit(SSE_EVENTS.RESOURCE_SYNTHESIZED, {
      teamId,
      teamName: result.updatedTeam.name,
      cost: SYNTHESIS_COST,
    });

    return NextResponse.json({
      success: true,
      data: {
        message: `Synthesized 1 raw material for $${SYNTHESIS_COST}`,
        team: result.updatedTeam,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to synthesize";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
