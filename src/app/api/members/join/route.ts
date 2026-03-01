import { NextRequest, NextResponse } from "next/server";
import { memberRegistry } from "@/lib/member-registry";
import { prisma } from "@/lib/prisma";
import { Tier } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { memberId, teamId, name } = await req.json();

    if (!memberId || !teamId || !name?.trim()) {
      return NextResponse.json(
        { success: false, error: "memberId, teamId, and name are required" },
        { status: 400 }
      );
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return NextResponse.json({ success: false, error: "Team not found" }, { status: 404 });
    }

    const isCoreTeam = team.tier === Tier.CORE;
    const member = memberRegistry.join(memberId, teamId, name.trim(), isCoreTeam);

    return NextResponse.json({ success: true, data: { member } });
  } catch {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
