import { NextResponse } from "next/server";
import { getMetrics } from "@/lib/metrics";
import { logIncident, countIncidents24h } from "@/lib/incident-log";

export async function GET() {
  try {
    const metrics = getMetrics();
    const endpoints = Object.values(metrics);
    const incidents24h = await countIncidents24h().catch(() => 0);

    if (endpoints.length === 0) {
      return NextResponse.json({ status: "green", p95: 0, incidents24h });
    }

    const maxP95 = Math.max(...endpoints.map((m) => m.p95));
    const totalErrors = endpoints.reduce((s, m) => s + m.errors, 0);
    const totalRecent = endpoints.reduce((s, m) => s + m.rpm, 0);
    const errorRate = totalRecent > 0 ? totalErrors / totalRecent : 0;

    let status: "green" | "yellow" | "red";
    if (maxP95 > 5000 || errorRate > 0.1) status = "red";
    else if (maxP95 > 2000 || errorRate > 0.05) status = "yellow";
    else status = "green";

    if (status !== "green") {
      await logIncident(
        status === "red" ? "error" : "warn",
        "api/status",
        `API ${status}: p95=${maxP95}ms errorRate=${(errorRate * 100).toFixed(1)}%`
      ).catch(() => {/* ignore */});
    }

    return NextResponse.json({ status, p95: maxP95, incidents24h });
  } catch {
    return NextResponse.json({ status: "green", p95: 0, incidents24h: 0 });
  }
}
