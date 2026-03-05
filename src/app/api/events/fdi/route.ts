import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sseBroadcaster, SSE_EVENTS } from "@/lib/sse";
import { Tier } from "@prisma/client";
import type { FdiRequest } from "@/types";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body: FdiRequest = await request.json();
    const { investorId, recipientId } = body;

    if (!investorId || !recipientId) {
      return NextResponse.json(
        { success: false, error: "investorId and recipientId are required" },
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

    const result = await prisma.$transaction(async (tx) => {
      const investor = await tx.team.findUnique({ where: { id: investorId } });
      const recipient = await tx.team.findUnique({ where: { id: recipientId } });

      if (!investor) throw new Error("Investor team not found");
      if (!recipient) throw new Error("Recipient team not found");
      if (investor.tier !== Tier.CORE) throw new Error("Investor must be a Core team");
      if (recipient.tier !== Tier.PERIPHERY && recipient.tier !== Tier.SEMI_PERIPHERY) throw new Error("Recipient must be a Periphery or Semi-Periphery team");
      if (recipient.fdiInvestorId) throw new Error("Recipient already has an FDI investor");

      // Apply FDI: +1 tech level, set investor
      const updateResult = await tx.team.updateMany({
        where: { id: recipientId, fdiInvestorId: null },
        data: {
          techLevel: { increment: 1 },
          fdiInvestorId: investorId,
        },
      });
      if (updateResult.count === 0) throw new Error("Recipient already has an FDI investor");
      const updatedRecipient = await tx.team.findUnique({ where: { id: recipientId } });
      if (!updatedRecipient) throw new Error("Recipient team not found after update");

      const log = await tx.gameEventLog.create({
        data: {
          message: `🏦 FOREIGN DIRECT INVESTMENT — ${investor.name} invested in ${recipient.name}. ${recipient.name} gains +1 Tech Level but 50% of manufacturing profits now go to ${investor.name}.`,
        },
      });

      return { updatedRecipient, investor, log };
    });

    // Broadcast
    sseBroadcaster.emit(SSE_EVENTS.TEAM_UPDATE, { team: result.updatedRecipient });
    sseBroadcaster.emit(SSE_EVENTS.EVENT_LOG, { log: result.log });

    return NextResponse.json({
      success: true,
      data: {
        message: "FDI applied",
        recipient: result.updatedRecipient,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to apply FDI";
    console.error("POST /api/events/fdi error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
