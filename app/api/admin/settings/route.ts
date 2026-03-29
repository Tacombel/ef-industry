export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getSettings() {
  return prisma.settings.upsert({
    where: { id: "global" },
    create: { id: "global", registrationOpen: true },
    update: {},
  });
}

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { registrationOpen } = await req.json();
  if (typeof registrationOpen !== "boolean") {
    return NextResponse.json({ error: "registrationOpen must be a boolean" }, { status: 400 });
  }

  const settings = await prisma.settings.upsert({
    where: { id: "global" },
    create: { id: "global", registrationOpen },
    update: { registrationOpen },
  });

  return NextResponse.json(settings);
}
