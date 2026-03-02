import { NextResponse } from "next/server";
import { sabotageState } from "@/lib/sabotage-state";

export const dynamic = "force-dynamic";

// GET — returns active embargoes, strikes, tariffs, and cooldown info
export async function GET() {
  try {
    const embargoes = sabotageState.getActiveEmbargoes();
    const strikes = sabotageState.getActiveStrikes();
    const tariffs = sabotageState.getActiveTariffs();

    return NextResponse.json({
      success: true,
      data: { embargoes, strikes, tariffs },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
