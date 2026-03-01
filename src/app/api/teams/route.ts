import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        tier: true,
        wealth: true,
        rawMaterials: true,
        techLevel: true,
        fdiInvestorId: true,
      },
    });
    return NextResponse.json({ success: true, data: teams });
  } catch (error) {
    console.error("GET /api/teams error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}
