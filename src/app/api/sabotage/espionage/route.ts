import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sseBroadcaster, SSE_EVENTS } from "@/lib/sse";
import { sabotageState } from "@/lib/sabotage-state";
import { ESPIONAGE_COST_ON_FAIL, ESPIONAGE_SUCCESS_CHANCE } from "@/lib/game-config";
import { checkGameActive, checkMemberRole } from "@/lib/game-guards";
import { Tier } from "@prisma/client";

export const dynamic = "force-dynamic";

// POST { attackerId, targetId, memberId }
// Periphery or Semi-Periphery can attempt to steal +1 tech from a higher-tier team
// 25% success, 75% failure (attacker pays $40 fine to target)
export async function POST(req: NextRequest) {
  try {
    const { attackerId, targetId, memberId } = await req.json();

    if (!attackerId || !targetId) {
      return NextResponse.json({ success: false, error: "attackerId and targetId required" }, { status: 400 });
    }
    if (attackerId === targetId) {
      return NextResponse.json({ success: false, error: "Cannot spy on yourself" }, { status: 400 });
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

    // Check tier restriction BEFORE recording cooldown (tier is immutable — no TOCTOU risk)
    const attackerCheck = await prisma.team.findUnique({ where: { id: attackerId }, select: { tier: true } });
    if (!attackerCheck) {
      return NextResponse.json({ success: false, error: "Attacker team not found" }, { status: 404 });
    }
    if (attackerCheck.tier !== Tier.PERIPHERY && attackerCheck.tier !== Tier.SEMI_PERIPHERY) {
      return NextResponse.json({ success: false, error: "Only Periphery and Semi-Periphery nations can use espionage" }, { status: 403 });
    }

    // Record cooldown BEFORE the async DB transaction to prevent TOCTOU race
    sabotageState.recordSabotage(attackerId);

    const succeeded = Math.random() < ESPIONAGE_SUCCESS_CHANCE;

    const result = await prisma.$transaction(async (tx) => {
      const attacker = await tx.team.findUnique({ where: { id: attackerId } });
      if (!attacker) throw new Error("Attacker team not found");

      const target = await tx.team.findUnique({ where: { id: targetId } });
      if (!target) throw new Error("Target team not found");

      // Target must have higher or equal tech to be worth spying on
      if (target.techLevel <= attacker.techLevel) {
        throw new Error("Target has no tech advantage to steal");
      }

      if (succeeded) {
        // +1 tech to attacker
        const updatedAttackerResult = await tx.team.updateMany({
          where: { id: attackerId, techLevel: { lt: target.techLevel } },
          data: { techLevel: { increment: 1 } },
        });
        if (updatedAttackerResult.count === 0) throw new Error("Target no longer has a tech advantage");
        const updatedAttacker = await tx.team.findUnique({ where: { id: attackerId } });
        if (!updatedAttacker) throw new Error("Attacker not found after update");

        const log = await tx.gameEventLog.create({
          data: { message: `${attacker.name} STOLE technology from ${target.name}! (+1 tech level)` },
        });

        return { updatedAttacker, updatedTarget: target, log, succeeded: true };
      } else {
        // Failure — attacker pays fine to target (atomic conditional deduction)
        const fineResult: { id: string }[] = await tx.$queryRawUnsafe(
          `UPDATE "teams"
           SET "wealth" = "wealth" - $1
           WHERE "id" = $2 AND "wealth" >= $1
           RETURNING "id"`,
          ESPIONAGE_COST_ON_FAIL,
          attackerId
        );
        if (fineResult.length === 0) {
          throw new Error(`Espionage failed and you can't afford the $${ESPIONAGE_COST_ON_FAIL} fine (have $${attacker.wealth})`);
        }

        // Re-fetch attacker for broadcasting
        const updatedAttacker = await tx.team.findUnique({ where: { id: attackerId } });
        if (!updatedAttacker) throw new Error("Attacker not found after update");

        const updatedTarget = await tx.team.update({
          where: { id: targetId },
          data: { wealth: { increment: ESPIONAGE_COST_ON_FAIL } },
        });

        const log = await tx.gameEventLog.create({
          data: { message: `${attacker.name} FAILED espionage on ${target.name}! Fined $${ESPIONAGE_COST_ON_FAIL}` },
        });

        return { updatedAttacker, updatedTarget, log, succeeded: false };
      }
    });

    // Broadcast
    sseBroadcaster.emit(SSE_EVENTS.TEAM_UPDATE, { team: result.updatedAttacker });
    sseBroadcaster.emit(SSE_EVENTS.TEAM_UPDATE, { team: result.updatedTarget });
    sseBroadcaster.emit(SSE_EVENTS.EVENT_LOG, { log: result.log });
    sseBroadcaster.emit(SSE_EVENTS.ESPIONAGE_RESULT, {
      attackerId,
      attackerName: result.updatedAttacker.name,
      targetId,
      targetName: result.updatedTarget.name,
      succeeded: result.succeeded,
    });

    const msg = result.succeeded
      ? `Espionage succeeded! Stole technology from ${result.updatedTarget.name}`
      : `Espionage failed! Fined $${ESPIONAGE_COST_ON_FAIL} (paid to ${result.updatedTarget.name})`;

    return NextResponse.json({ success: true, data: { message: msg, succeeded: result.succeeded } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Espionage failed";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
