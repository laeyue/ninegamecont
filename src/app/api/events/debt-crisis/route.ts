import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sseBroadcaster, SSE_EVENTS } from "@/lib/sse";
import { Tier } from "@prisma/client";

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
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

    // Halve wealth of all Periphery teams
    const peripheryTeams = await prisma.team.findMany({
      where: { tier: Tier.PERIPHERY },
    });

    const updatedTeams = [];
    for (const team of peripheryTeams) {
      const newWealth = Math.floor(team.wealth / 2);
      const updated = await prisma.team.update({
        where: { id: team.id },
        data: { wealth: newWealth },
      });
      updatedTeams.push(updated);
    }

    // Log the event
    const log = await prisma.gameEventLog.create({
      data: {
        message:
          "💥 DEBT CRISIS — All Periphery nations have had their wealth halved!",
      },
    });

    // Broadcast updates
    for (const team of updatedTeams) {
      sseBroadcaster.emit(SSE_EVENTS.TEAM_UPDATE, { team });
    }
    sseBroadcaster.emit(SSE_EVENTS.EVENT_LOG, { log });

    return NextResponse.json({
      success: true,
      data: { message: "Debt crisis triggered", affectedTeams: updatedTeams.length },
    });
  } catch (error) {
    console.error("POST /api/events/debt-crisis error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to trigger debt crisis" },
      { status: 500 }
    );
  }
}
