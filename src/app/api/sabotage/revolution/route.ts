import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sseBroadcaster, SSE_EVENTS } from "@/lib/sse";
import { sabotageState } from "@/lib/sabotage-state";
import { checkGameActive, checkMemberRole } from "@/lib/game-guards";
import { Tier } from "@prisma/client";

export const dynamic = "force-dynamic";

// POST { teamId, memberId }
// Periphery team can revolt:
// - Breaks FDI link permanently
// - Costs half current wealth
// - Tech level resets to 0
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

    // Check tier restriction BEFORE recording cooldown (tier is immutable — no TOCTOU risk)
    const teamCheck = await prisma.team.findUnique({ where: { id: teamId }, select: { tier: true } });
    if (!teamCheck) {
      return NextResponse.json({ success: false, error: "Team not found" }, { status: 404 });
    }
    if (teamCheck.tier !== Tier.PERIPHERY) {
      return NextResponse.json({ success: false, error: "Only Periphery nations can start a revolution" }, { status: 403 });
    }

    // Record cooldown BEFORE the async DB transaction to prevent TOCTOU race
    sabotageState.recordSabotage(teamId);

    const result = await prisma.$transaction(async (tx) => {
      const team = await tx.team.findUnique({ where: { id: teamId } });
      if (!team) throw new Error("Team not found");

      if (!team.fdiInvestorId) {
        throw new Error("No FDI investor — there is nothing to revolt against");
      }

      const investorName = (await tx.team.findUnique({ where: { id: team.fdiInvestorId } }))?.name ?? "Unknown";

      const halfWealth = Math.floor(team.wealth / 2);

      // Apply revolution
      const updatedResult = await tx.team.updateMany({
        where: { id: teamId, fdiInvestorId: { not: null } },
        data: {
          fdiInvestorId: null,
          wealth: team.wealth - halfWealth,
          techLevel: 0,
        },
      });
      if (updatedResult.count === 0) throw new Error("Revolution already occurred");
      const updated = await tx.team.findUnique({ where: { id: teamId } });
      if (!updated) throw new Error("Team not found after update");

      const log = await tx.gameEventLog.create({
        data: {
          message: `${team.name} started a REVOLUTION! FDI link to ${investorName} broken. Lost $${halfWealth} and all technology.`,
        },
      });

      return { updated, investorName, halfWealth, log };
    });

    // Broadcast
    sseBroadcaster.emit(SSE_EVENTS.TEAM_UPDATE, { team: result.updated });
    sseBroadcaster.emit(SSE_EVENTS.EVENT_LOG, { log: result.log });
    sseBroadcaster.emit(SSE_EVENTS.REVOLUTION, {
      teamId,
      teamName: result.updated.name,
      investorName: result.investorName,
    });

    return NextResponse.json({
      success: true,
      data: {
        message: `Revolution! FDI link to ${result.investorName} broken. Lost $${result.halfWealth} and tech reset to 0.`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Revolution failed";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
