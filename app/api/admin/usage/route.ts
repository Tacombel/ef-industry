import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { statSync } from "fs";
import { resolve } from "path";

function getDbSizeBytes(): number {
  try {
    const url = process.env.DATABASE_URL ?? "";
    const filePath = url.replace(/^file:/, "");
    const absPath = filePath.startsWith("/") ? filePath : resolve(process.cwd(), filePath);
    return statSync(absPath).size;
  } catch {
    return 0;
  }
}

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const logs = await prisma.usageLog.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: { createdAt: true, userId: true, path: true, type: true },
    orderBy: { createdAt: "asc" },
  });

  // Daily breakdown
  const dailyMap = new Map<string, { registered: number; anonymous: number }>();
  for (const log of logs) {
    const date = log.createdAt.toISOString().slice(0, 10);
    const entry = dailyMap.get(date) ?? { registered: 0, anonymous: 0 };
    if (log.userId) entry.registered++;
    else entry.anonymous++;
    dailyMap.set(date, entry);
  }
  const daily = Array.from(dailyMap.entries())
    .map(([date, counts]) => ({ date, ...counts }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Top paths
  const pathMap = new Map<string, { type: string; registered: number; anonymous: number }>();
  for (const log of logs) {
    const entry = pathMap.get(log.path) ?? { type: log.type, registered: 0, anonymous: 0 };
    if (log.userId) entry.registered++;
    else entry.anonymous++;
    pathMap.set(log.path, entry);
  }
  const topPaths = Array.from(pathMap.entries())
    .map(([path, data]) => ({ path, ...data, total: data.registered + data.anonymous }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 20);

  const totalRegistered = logs.filter((l) => l.userId).length;
  const totalAnonymous = logs.filter((l) => !l.userId).length;

  return NextResponse.json({
    daily,
    topPaths,
    totals: { registered: totalRegistered, anonymous: totalAnonymous },
    dbSizeBytes: getDbSizeBytes(),
  });
}
