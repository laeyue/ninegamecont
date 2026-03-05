import { NextRequest, NextResponse } from "next/server";
import { memberRegistry } from "@/lib/member-registry";
import { prisma } from "@/lib/prisma";
import { sseBroadcaster, SSE_EVENTS } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { teamId } = await req.json();

    if (!teamId) {
      return NextResponse.json({ success: false, error: "teamId required" }, { status: 400 });
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return NextResponse.json({ success: false, error: "Team not found" }, { status: 404 });
    }

    const updatedMembers = memberRegistry.rotateRoles(teamId);

    // Broadcast so all connected players on this team update their role
    sseBroadcaster.emit(SSE_EVENTS.ROLES_ROTATED, { teamId, members: updatedMembers });

    return NextResponse.json({ success: true, data: { members: updatedMembers } });
  } catch (error) {
    console.error("POST /api/members/rotate error:", error);
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
