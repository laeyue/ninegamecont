import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sseBroadcaster, SSE_EVENTS } from "@/lib/sse";
import { canManufacture, getManufactureOutput, getManufactureCooldownMs, FDI_TAX_RATE } from "@/lib/game-config";
import { sabotageState } from "@/lib/sabotage-state";
import { checkGameActive, checkMemberRole } from "@/lib/game-guards";
import type { ManufactureRequest } from "@/types";

export const dynamic = 'force-dynamic';

// In-memory cooldown tracking per player
const globalForManufacture = globalThis as unknown as { lastManufactureTime: Map<string, number> | undefined };
const lastManufactureTime = globalForManufacture.lastManufactureTime ?? new Map<string, number>();
if (process.env.NODE_ENV !== "production") globalForManufacture.lastManufactureTime = lastManufactureTime;

export async function POST(request: NextRequest) {
  try {
    const body: ManufactureRequest = await request.json();
    const { teamId, memberId } = body;

    if (!teamId || !memberId) {
      return NextResponse.json(
        { success: false, error: "teamId and memberId are required" },
        { status: 400 }
      );
    }

    // Check game is active (not frozen, not pre-game)
    const gameCheck = await checkGameActive();
    if (gameCheck) return gameCheck;

    // Check role
    const roleCheck = checkMemberRole(memberId, "MANUFACTURER");
    if (roleCheck) return roleCheck;

    // Fetch team for cooldown check
    const teamCheck = await prisma.team.findUnique({ where: { id: teamId } });
    if (!teamCheck) {
      return NextResponse.json(
        { success: false, error: "Team not found" },
        { status: 404 }
      );
    }

    // Enforce manufacture cooldown (server-side per player)
    const cooldownMs = getManufactureCooldownMs(teamCheck.tier);
    const now = Date.now();
    const lastTime = lastManufactureTime.get(memberId) ?? 0;
    const elapsed = now - lastTime;

    if (elapsed < cooldownMs) {
      const remaining = Math.ceil((cooldownMs - elapsed) / 1000);
      return NextResponse.json(
        { success: false, error: `Cooldown: ${remaining}s remaining` },
        { status: 429 }
      );
    }

    // Record cooldown
    lastManufactureTime.set(memberId, now);

    // Use transaction for atomicity
    let result;
    try {
      result = await prisma.$transaction(async (tx) => {
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

        // Calculate output
        const baseOutput = getManufactureOutput(team.tier, team.techLevel);
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

        // Atomic conditional update — only decrements if raw_materials >= 1
        // This prevents the TOCTOU race where two concurrent transactions both
        // read rawMaterials=1, both pass a check, and both decrement to -1.
        const updateResult: { id: string }[] = await tx.$queryRawUnsafe(
          `UPDATE "teams"
           SET "raw_materials" = "raw_materials" - 1,
               "wealth" = "wealth" + $1
           WHERE "id" = $2 AND "raw_materials" >= 1
           RETURNING "id"`,
          teamProfit,
          teamId
        );

        if (updateResult.length === 0) {
          throw new Error("Not enough raw materials");
        }

        // Re-fetch the updated team to get current state for broadcasting
        const updated = await tx.team.findUnique({ where: { id: teamId } });
        if (!updated) throw new Error("Team not found after update");

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
    } catch (txError) {
      // Revert the cooldown if the database transaction blocked the action
      lastManufactureTime.set(memberId, lastTime);
      throw txError;
    }

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
