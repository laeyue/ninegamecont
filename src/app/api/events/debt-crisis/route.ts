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

    // Halve wealth of all Periphery teams atomically
    const updatedTeams: { id: string; name: string; tier: string; wealth: number; raw_materials: number; tech_level: number; fdi_investor_id: string | null }[] = await prisma.$queryRawUnsafe(`
      UPDATE "teams"
      SET "wealth" = FLOOR("wealth" / 2)
      WHERE "tier" = 'PERIPHERY'
      RETURNING *
    `);

    // Log the event
    const log = await prisma.gameEventLog.create({
      data: {
        message:
          "💥 DEBT CRISIS — All Periphery nations have had their wealth halved!",
      },
    });

    // Map raw query results back to camelCase Prisma model format
    const formattedTeams = updatedTeams.map(t => ({
      id: t.id,
      name: t.name,
      tier: t.tier as Tier,
      wealth: t.wealth,
      rawMaterials: t.raw_materials,
      techLevel: t.tech_level,
      fdiInvestorId: t.fdi_investor_id,
    }));

    // Broadcast updates
    for (const team of formattedTeams) {
      sseBroadcaster.emit(SSE_EVENTS.TEAM_UPDATE, { team });
    }
    sseBroadcaster.emit(SSE_EVENTS.EVENT_LOG, { log });

    return NextResponse.json({
      success: true,
      data: { message: "Debt crisis triggered", affectedTeams: formattedTeams.length },
    });
  } catch (error) {
    console.error("POST /api/events/debt-crisis error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to trigger debt crisis" },
      { status: 500 }
    );
  }
}
