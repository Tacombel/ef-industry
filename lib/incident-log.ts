import { prisma } from "@/lib/prisma";

export type IncidentLevel = "error" | "warn" | "info";

export async function logIncident(
  level: IncidentLevel,
  source: string,
  message: string,
  detail?: string
): Promise<void> {
  try {
    await prisma.incidentLog.create({ data: { level, source, message, detail } });
  } catch {
    // Never throw — logging must not break callers
  }
}

export async function getIncidents(opts: {
  limit?: number;
  source?: string;
  level?: IncidentLevel;
  since?: Date;
} = {}) {
  const { limit = 200, source, level, since } = opts;
  return prisma.incidentLog.findMany({
    where: {
      ...(source ? { source } : {}),
      ...(level ? { level } : {}),
      ...(since ? { createdAt: { gte: since } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function countIncidents24h(): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return prisma.incidentLog.count({ where: { createdAt: { gte: since }, level: "error" } });
}
