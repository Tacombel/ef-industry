import { prisma } from "@/lib/prisma";

interface TrackOptions {
  type: "api" | "page";
  path: string;
  method?: string;
  userId?: string | null;
  role?: string | null;
  statusCode?: number;
  ms?: number;
}

export function trackEvent(opts: TrackOptions): void {
  if (opts.role === "ADMIN" || opts.role === "SUPERADMIN") return;

  prisma.usageLog.create({
    data: {
      type: opts.type,
      path: opts.path,
      method: opts.method ?? null,
      userId: opts.userId ?? null,
      statusCode: opts.statusCode ?? null,
      ms: opts.ms ?? null,
    },
  }).catch(() => {});
}
