import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sseBroadcaster, SSE_EVENTS } from "@/lib/sse";
import { sabotageState } from "@/lib/sabotage-state";
import { STRIKE_DURATION_MS, STRIKE_INVESTOR_PENALTY } from "@/lib/game-config";
import { checkGameActive, checkMemberRole } from "@/lib/game-guards";
import { Tier } from "@prisma/client";

export const dynamic = "force-dynamic";

// POST { teamId, memberId }
// Periphery team with FDI can call a worker strike:
// - Disables own mining + manufacturing for 30s
// - Costs the Core FDI investor $30
export async function POST(req: NextRequest) {
  try {
    const { teamId, memberId } = await req.json();

    if (!teamId) {
      return NextResponse.json({ success: false, error: "teamId required" }, { status: 400 });
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
    const cd = sabotageState.canSabotage(teamId);
    if (!cd.allowed) {
      return NextResponse.json(
        { success: false, error: `Sabotage cooldown: ${Math.ceil(cd.remainingMs / 1000)}s remaining` },
        { status: 429 }
      );
    }

    // Check already on strike
    if (sabotageState.isOnStrike(teamId)) {
      return NextResponse.json({ success: false, error: "Already on strike" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const team = await tx.team.findUnique({ where: { id: teamId } });
      if (!team) throw new Error("Team not found");

      if (team.tier !== Tier.PERIPHERY) {
        throw new Error("Only Periphery nations can call a worker strike");
      }

      if (!team.fdiInvestorId) {
        throw new Error("No FDI investor — a strike requires a foreign investor to hurt");
      }

      // Penalize the Core investor (clamp so wealth doesn't go negative)
      const investor = await tx.team.findUnique({ where: { id: team.fdiInvestorId } });
      if (!investor) throw new Error("FDI investor not found");

      const actualPenalty = Math.min(STRIKE_INVESTOR_PENALTY, investor.wealth);

      const updatedInvestor = await tx.team.update({
        where: { id: team.fdiInvestorId },
        data: { wealth: { decrement: actualPenalty } },
      });

      const log = await tx.gameEventLog.create({
        data: {
          message: `${team.name} called a WORKER STRIKE! Own production halted for 30s. ${updatedInvestor.name} loses $${actualPenalty}`,
        },
      });

      return { team, updatedInvestor, actualPenalty, log };
    });

    // Record in-memory state
    const entry = sabotageState.addStrike(teamId, result.team.name, STRIKE_DURATION_MS);

    // Broadcast
    sseBroadcaster.emit(SSE_EVENTS.TEAM_UPDATE, { team: result.updatedInvestor });
    sseBroadcaster.emit(SSE_EVENTS.EVENT_LOG, { log: result.log });
    sseBroadcaster.emit(SSE_EVENTS.STRIKE_STARTED, {
      teamId,
      teamName: result.team.name,
      investorName: result.updatedInvestor.name,
      until: entry.until,
    });

    return NextResponse.json({
      success: true,
      data: { message: `Worker strike called! Production halted for 30s. ${result.updatedInvestor.name} loses $${result.actualPenalty}` },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Strike failed";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
