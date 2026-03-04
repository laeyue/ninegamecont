import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sseBroadcaster, SSE_EVENTS } from "@/lib/sse";
import { sabotageState } from "@/lib/sabotage-state";
import { TARIFF_COST, TARIFF_DURATION_MS, TARIFF_RATE } from "@/lib/game-config";
import { checkGameActive, checkMemberRole } from "@/lib/game-guards";
import { Tier } from "@prisma/client";

export const dynamic = "force-dynamic";

// POST { attackerId, targetId, memberId }
// Core-exclusive: impose a tariff on a target team for 60s.
// While active, the target receives only 50% of market sale proceeds.
export async function POST(req: NextRequest) {
  try {
    const { attackerId, targetId, memberId } = await req.json();

    if (!attackerId || !targetId) {
      return NextResponse.json({ success: false, error: "attackerId and targetId required" }, { status: 400 });
    }
    if (attackerId === targetId) {
      return NextResponse.json({ success: false, error: "Cannot impose tariff on yourself" }, { status: 400 });
    }

    // Check game is active (not frozen, not pre-game)
    const gameCheck = await checkGameActive();
    if (gameCheck) return gameCheck;

    // Check role (only SABOTEUR can sabotage)
    if (memberId) {
      const roleCheck = checkMemberRole(memberId, "SABOTEUR");
      if (roleCheck) return roleCheck;
    }

    // Check sabotage cooldown (15s per team)
    const cd = sabotageState.canSabotage(attackerId);
    if (!cd.allowed) {
      return NextResponse.json(
        { success: false, error: `Sabotage cooldown: ${Math.ceil(cd.remainingMs / 1000)}s remaining` },
        { status: 429 }
      );
    }

    // Check if target already has an active tariff
    if (sabotageState.getTariff(targetId)) {
      return NextResponse.json({ success: false, error: "Target already has an active tariff" }, { status: 400 });
    }

    // Record cooldown BEFORE the async DB transaction to prevent TOCTOU race
    sabotageState.recordSabotage(attackerId);

    const result = await prisma.$transaction(async (tx) => {
      const attacker = await tx.team.findUnique({ where: { id: attackerId } });
      if (!attacker) throw new Error("Attacker team not found");

      // Only Core can impose tariffs
      if (attacker.tier !== Tier.CORE) {
        throw new Error("Only Core nations can impose trade tariffs");
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
        TARIFF_COST,
        attackerId
      );
      if (deductResult.length === 0) {
        throw new Error(`Not enough wealth. Need $${TARIFF_COST}, have $${attacker.wealth}`);
      }

      // Re-fetch attacker for broadcasting
      const updatedAttacker = await tx.team.findUnique({ where: { id: attackerId } });
      if (!updatedAttacker) throw new Error("Attacker not found after update");

      // Log
      const log = await tx.gameEventLog.create({
        data: { message: `${attacker.name} imposed a TRADE TARIFF on ${target.name} for 60s — seller receives only 50% of proceeds (-$${TARIFF_COST})` },
      });

      return { updatedAttacker, target, log };
    });

    // Record in-memory state
    const entry = sabotageState.addTariff(targetId, attackerId, result.updatedAttacker.name, TARIFF_RATE, TARIFF_DURATION_MS);

    // Broadcast
    sseBroadcaster.emit(SSE_EVENTS.TEAM_UPDATE, { team: result.updatedAttacker });
    sseBroadcaster.emit(SSE_EVENTS.EVENT_LOG, { log: result.log });
    sseBroadcaster.emit(SSE_EVENTS.TARIFF_IMPOSED, {
      targetTeamId: targetId,
      targetName: result.target.name,
      imposedByName: result.updatedAttacker.name,
      rate: TARIFF_RATE,
      until: entry.until,
    });

    return NextResponse.json({ success: true, data: { message: `Trade tariff imposed on ${result.target.name}` } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to impose tariff";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
