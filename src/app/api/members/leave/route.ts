import { NextRequest, NextResponse } from "next/server";
import { memberRegistry } from "@/lib/member-registry";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { memberId } = await req.json();
    if (!memberId) {
      return NextResponse.json({ success: false, error: "memberId required" }, { status: 400 });
    }
    memberRegistry.leave(memberId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
