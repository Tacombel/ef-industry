import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const packs = await prisma.pack.findMany({
    include: { items: { include: { item: { include: { blueprints: { where: { isDefault: true }, select: { factory: true }, take: 1 } } } } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(packs);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description, items = [] } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const pack = await prisma.pack.create({
    data: {
      name: name.trim(),
      description,
      items: {
        create: items.map((i: { itemId: string; quantity: number }) => ({
          itemId: i.itemId,
          quantity: i.quantity,
        })),
      },
    },
    include: { items: { include: { item: { include: { blueprints: { where: { isDefault: true }, select: { factory: true }, take: 1 } } } } } },
  });

  return NextResponse.json(pack, { status: 201 });
}
