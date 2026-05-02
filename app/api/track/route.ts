import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { trackEvent } from "@/lib/track";

export async function POST(req: NextRequest) {
  try {
    const { path } = await req.json();
    if (!path || typeof path !== "string") return NextResponse.json({}, { status: 400 });

    const session = await getSession();
    trackEvent({
      type: "page",
      path,
      userId: session?.userId,
      role: session?.role,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({}, { status: 400 });
  }
}
