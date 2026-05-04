import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.userPreference.findMany({
    where: { userId: session.userId },
    select: { itemId: true, preferenceType: true, value: true },
  });

  const factory: Record<string, string> = {};
  const refinery: Record<string, string> = {};
  const ui: Record<string, string> = {};
  for (const row of rows) {
    if (row.preferenceType === "factory") factory[row.itemId] = row.value;
    else if (row.preferenceType === "refinery") refinery[row.itemId] = row.value;
    else if (row.preferenceType === "ui") ui[row.itemId] = row.value;
  }

  return NextResponse.json({ factory, refinery, ui });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { itemId, preferenceType, value } = body;

  if (typeof itemId !== "string" || !itemId)
    return NextResponse.json({ error: "itemId required" }, { status: 400 });
  if (preferenceType !== "factory" && preferenceType !== "refinery" && preferenceType !== "ui")
    return NextResponse.json({ error: "preferenceType must be factory, refinery or ui" }, { status: 400 });
  if (typeof value !== "string" || !value)
    return NextResponse.json({ error: "value required" }, { status: 400 });

  await prisma.userPreference.upsert({
    where: { userId_itemId_preferenceType: { userId: session.userId, itemId, preferenceType } },
    create: { userId: session.userId, itemId, preferenceType, value },
    update: { value },
  });

  return NextResponse.json({ ok: true });
}
