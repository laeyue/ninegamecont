import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sseBroadcaster, SSE_EVENTS } from "@/lib/sse";
import { DEFAULT_TIMER_SECONDS } from "@/lib/game-config";
import type { UpdateGameStateRequest } from "@/types";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let state = await prisma.gameState.findUnique({
      where: { id: "singleton" },
    });

    if (!state) {
      state = await prisma.gameState.create({
        data: {
          id: "singleton",
          timerSeconds: DEFAULT_TIMER_SECONDS,
          timerRunning: false,
          gameFrozen: false,
        },
      });
    }

    return NextResponse.json({ success: true, data: state });
  } catch (error) {
    console.error("GET /api/game/state error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch game state" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body: UpdateGameStateRequest = await request.json();

    const current = await prisma.gameState.findUnique({
      where: { id: "singleton" },
    });

    const updateData: Record<string, unknown> = {};

    if (body.timerSeconds !== undefined) {
      updateData.timerSeconds = body.timerSeconds;
    }

    if (body.timerRunning !== undefined) {
      updateData.timerRunning = body.timerRunning;
      if (body.timerRunning) {
        // Calculate when timer ends
        const seconds = body.timerSeconds ?? current?.timerSeconds ?? DEFAULT_TIMER_SECONDS;
        updateData.timerEndsAt = new Date(Date.now() + seconds * 1000);
      } else {
        // Pause: calculate remaining time and store it
        if (current?.timerEndsAt) {
          const remaining = Math.max(
            0,
            Math.floor((new Date(current.timerEndsAt).getTime() - Date.now()) / 1000)
          );
          updateData.timerSeconds = remaining;
        }
        updateData.timerEndsAt = null;
      }
    }

    if (body.gameFrozen !== undefined) {
      updateData.gameFrozen = body.gameFrozen;
      if (body.gameFrozen) {
        // Stop timer when game freezes
        updateData.timerRunning = false;
        updateData.timerEndsAt = null;
      }
    }

    const updated = await prisma.gameState.update({
      where: { id: "singleton" },
      data: updateData,
    });

    sseBroadcaster.emit(SSE_EVENTS.GAME_STATE_UPDATE, { state: updated });

    // Log freeze/unfreeze events
    if (body.gameFrozen !== undefined) {
      const log = await prisma.gameEventLog.create({
        data: {
          message: body.gameFrozen
            ? "🛑 GAME ENDED — All trading frozen!"
            : "▶️ Game resumed — Trading is open!",
        },
      });
      sseBroadcaster.emit(SSE_EVENTS.EVENT_LOG, { log });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PUT /api/game/state error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update game state" },
      { status: 500 }
    );
  }
}
