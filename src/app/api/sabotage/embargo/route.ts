import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sseBroadcaster, SSE_EVENTS } from "@/lib/sse";
import { sabotageState } from "@/lib/sabotage-state";
import { EMBARGO_COST, EMBARGO_DURATION_MS } from "@/lib/game-config";
import { checkGameActive, checkMemberRole } from "@/lib/game-guards";
import { Tier } from "@prisma/client";

export const dynamic = "force-dynamic";

// POST { attackerId, targetId, memberId }
// Core or Semi-Periphery can embargo any other team for 60s (blocks market access)
export async function POST(req: NextRequest) {
  try {
    const { attackerId, targetId, memberId } = await req.json();

    if (!attackerId || !targetId) {
      return NextResponse.json({ success: false, error: "attackerId and targetId required" }, { status: 400 });
    }
    if (attackerId === targetId) {
      return NextResponse.json({ success: false, error: "Cannot embargo yourself" }, { status: 400 });
    }

    // Check game is active (not frozen, not pre-game)
    const gameCheck = await checkGameActive();
    if (gameCheck) return gameCheck;

    // Check role (only SABOTEUR can sabotage)
    if (memberId) {
      const roleCheck = checkMemberRole(memberId, "SABOTEUR");
      if (roleCheck) return roleCheck;
    }

    // Check sabotage cooldown
    const cd = sabotageState.canSabotage(attackerId);
    if (!cd.allowed) {
      return NextResponse.json(
        { success: false, error: `Sabotage cooldown: ${Math.ceil(cd.remainingMs / 1000)}s remaining` },
        { status: 429 }
      );
    }

    // Check already embargoed
    if (sabotageState.isEmbargoed(targetId)) {
      return NextResponse.json({ success: false, error: "Target is already under an embargo" }, { status: 400 });
    }

    // Record cooldown BEFORE the async DB transaction to prevent TOCTOU race
    sabotageState.recordSabotage(attackerId);

    const result = await prisma.$transaction(async (tx) => {
      const attacker = await tx.team.findUnique({ where: { id: attackerId } });
      if (!attacker) throw new Error("Attacker team not found");

      // Only Core and Semi-Periphery can impose embargoes
      if (attacker.tier !== Tier.CORE && attacker.tier !== Tier.SEMI_PERIPHERY) {
        throw new Error("Only Core and Semi-Periphery nations can impose trade embargoes");
      }

      const target = await tx.team.findUnique({ where: { id: targetId } });
      if (!target) throw new Error("Target team not found");

      // Atomic conditional deduction — only deducts if wealth >= cost
      // Prevents TOCTOU race where concurrent requests both pass a check and both deduct.
      const deductResult: { id: string }[] = await tx.$queryRawUnsafe(
        `UPDATE "teams"
         SET "wealth" = "wealth" - $1
         WHERE "id" = $2 AND "wealth" >= $1
         RETURNING "id"`,
        EMBARGO_COST,
        attackerId
      );
      if (deductResult.length === 0) {
        throw new Error(`Not enough wealth. Need $${EMBARGO_COST}, have $${attacker.wealth}`);
      }

      // Re-fetch attacker for broadcasting
      const updatedAttacker = await tx.team.findUnique({ where: { id: attackerId } });
      if (!updatedAttacker) throw new Error("Attacker not found after update");

      // Log
      const log = await tx.gameEventLog.create({
        data: { message: `${attacker.name} imposed a TRADE EMBARGO on ${target.name} for 60s (-$${EMBARGO_COST})` },
      });

      return { updatedAttacker, target, log };
    });

    // Record in-memory state
    const entry = sabotageState.addEmbargo(targetId, attackerId, result.updatedAttacker.name, EMBARGO_DURATION_MS);

    // Broadcast
    sseBroadcaster.emit(SSE_EVENTS.TEAM_UPDATE, { team: result.updatedAttacker });
    sseBroadcaster.emit(SSE_EVENTS.EVENT_LOG, { log: result.log });
    sseBroadcaster.emit(SSE_EVENTS.EMBARGO_IMPOSED, {
      targetTeamId: targetId,
      targetName: result.target.name,
      imposedByName: result.updatedAttacker.name,
      until: entry.until,
    });

    return NextResponse.json({ success: true, data: { message: `Trade embargo imposed on ${result.target.name}` } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to impose embargo";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
