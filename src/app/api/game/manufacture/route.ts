import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sseBroadcaster, SSE_EVENTS } from "@/lib/sse";
import { canManufacture, getManufactureOutput, FDI_TAX_RATE } from "@/lib/game-config";
import { sabotageState } from "@/lib/sabotage-state";
import type { ManufactureRequest } from "@/types";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body: ManufactureRequest = await request.json();
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

    // Use transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      const team = await tx.team.findUnique({ where: { id: teamId } });
      if (!team) throw new Error("Team not found");

      // Check strike
      const strike = sabotageState.isOnStrike(teamId);
      if (strike) {
        const remaining = Math.ceil((strike.until - Date.now()) / 1000);
        throw new Error(`Worker strike in progress (${remaining}s remaining)`);
      }

      // Validate ability
      if (!canManufacture(team.tier, team.techLevel)) {
        throw new Error("Cannot manufacture: insufficient tech level");
      }

      // Validate resources
      if (team.rawMaterials < 1) {
        throw new Error("Not enough raw materials");
      }

      // Calculate output
      const baseOutput = getManufactureOutput(team.tier);
      let teamProfit = baseOutput;
      let investorProfit = 0;
      let investorTeam = null;

      // Apply FDI tax if applicable
      if (team.fdiInvestorId) {
        investorProfit = Math.floor(baseOutput * FDI_TAX_RATE);
        teamProfit = baseOutput - investorProfit;

        // Credit investor
        investorTeam = await tx.team.update({
          where: { id: team.fdiInvestorId },
          data: { wealth: { increment: investorProfit } },
        });
      }

      // Update manufacturing team
      const updated = await tx.team.update({
        where: { id: teamId },
        data: {
          rawMaterials: { decrement: 1 },
          wealth: { increment: teamProfit },
        },
      });

      // Log the event
      let logMessage = `${team.name} manufactured: +$${teamProfit}`;
      if (investorTeam) {
        logMessage += ` ($${investorProfit} extracted by ${investorTeam.name} via FDI)`;
      }

      const log = await tx.gameEventLog.create({
        data: { message: logMessage },
      });

      return { updated, investorTeam, log };
    });

    // Broadcast updates
    sseBroadcaster.emit(SSE_EVENTS.TEAM_UPDATE, { team: result.updated });
    if (result.investorTeam) {
      sseBroadcaster.emit(SSE_EVENTS.TEAM_UPDATE, { team: result.investorTeam });
    }
    sseBroadcaster.emit(SSE_EVENTS.EVENT_LOG, { log: result.log });

    return NextResponse.json({ success: true, data: { team: result.updated } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to manufacture";
    console.error("POST /api/game/manufacture error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
