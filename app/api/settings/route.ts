export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint: returns only the settings visible to unauthenticated users
export async function GET() {
  const settings = await prisma.settings.findUnique({ where: { id: "global" } });
  return NextResponse.json({ registrationOpen: settings?.registrationOpen ?? true });
}
