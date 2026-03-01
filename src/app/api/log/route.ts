import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const logs = await prisma.gameEventLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 100,
    });

    const data = logs.map((l) => ({
      id: l.id,
      message: l.message,
      timestamp: l.timestamp.toISOString(),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("GET /api/log error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
