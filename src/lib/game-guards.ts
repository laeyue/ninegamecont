import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { memberRegistry, type MemberRole } from "@/lib/member-registry";
import { DEFAULT_TIMER_SECONDS } from "@/lib/game-config";

/**
 * Shared server-side guards for all action routes.
 * Returns a NextResponse error if the check fails, or null if OK.
 */

/** Check if game is in pre-game state (not started yet) or frozen */
export async function checkGameActive(): Promise<NextResponse | null> {
  const gameState = await prisma.gameState.findUnique({
    where: { id: "singleton" },
  });

  if (gameState?.gameFrozen) {
    return NextResponse.json(
      { success: false, error: "Game is frozen" },
      { status: 403 }
    );
  }

  // Pre-game: timer at full duration, not running, not frozen
  const isPreGame =
    !gameState?.timerRunning &&
    !gameState?.gameFrozen &&
    (gameState?.timerSeconds ?? DEFAULT_TIMER_SECONDS) === DEFAULT_TIMER_SECONDS;

  if (isPreGame) {
    return NextResponse.json(
      { success: false, error: "Game has not started yet" },
      { status: 403 }
    );
  }

  return null; // OK
}

/** Check if a member exists and has the required role */
export function checkMemberRole(
  memberId: string,
  requiredRole: MemberRole
): NextResponse | null {
  const member = memberRegistry.getMember(memberId);

  if (!member) {
    return NextResponse.json(
      { success: false, error: "Member not found. Please rejoin the game." },
      { status: 403 }
    );
  }

  if (member.role !== requiredRole) {
    return NextResponse.json(
      {
        success: false,
        error: `Only the ${requiredRole} role can perform this action (you are ${member.role})`,
      },
      { status: 403 }
    );
  }

  return null; // OK
}
