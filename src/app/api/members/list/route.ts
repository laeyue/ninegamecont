import { NextResponse } from "next/server";
import { memberRegistry } from "@/lib/member-registry";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const all = memberRegistry.getAllMembers();
    return NextResponse.json({ success: true, data: { members: all } });
  } catch {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
