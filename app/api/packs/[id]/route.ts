import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const pack = await prisma.pack.findUnique({
    where: { id: params.id },
    include: { items: { include: { item: true } } },
  });

  if (!pack) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(pack);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { name, description, items } = body;

  const pack = await prisma.$transaction(async (tx) => {
    if (items !== undefined) {
      await tx.packItem.deleteMany({ where: { packId: params.id } });
    }

    return tx.pack.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description }),
        ...(items !== undefined && {
          items: {
            create: items.map((i: { itemId: string; quantity: number }) => ({
              itemId: i.itemId,
              quantity: i.quantity,
            })),
          },
        }),
      },
      include: { items: { include: { item: { include: { blueprints: { where: { isDefault: true }, select: { factory: true }, take: 1 } } } } } },
    });
  });

  return NextResponse.json(pack);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.pack.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
