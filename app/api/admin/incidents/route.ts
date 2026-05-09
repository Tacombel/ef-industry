import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getIncidents } from "@/lib/incident-log";
import type { IncidentLevel } from "@/lib/incident-log";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const limit = Math.min(Number(sp.get("limit") ?? 200), 500);
  const source = sp.get("source") ?? undefined;
  const level = (sp.get("level") ?? undefined) as IncidentLevel | undefined;
  const since = sp.get("since") ? new Date(sp.get("since")!) : undefined;

  const incidents = await getIncidents({ limit, source, level, since });
  return NextResponse.json(incidents);
}
