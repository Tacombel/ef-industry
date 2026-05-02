import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const collection = await prisma.collection.findUnique({
    where: { id: params.id },
    include: { items: { include: { item: true } } },
  });

  if (!collection) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (collection.userId !== session.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(collection);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.collection.findUnique({ where: { id: params.id }, select: { userId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.userId !== session.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, description, items } = body;

  try {
    const collection = await prisma.$transaction(async (tx) => {
      if (items !== undefined) {
        await tx.collectionItem.deleteMany({ where: { packId: params.id } });
      }

      return tx.collection.update({
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
        include: { items: { include: { item: { include: { blueprints: { select: { factory: true }, take: 1 } } } } } },
      });
    });
    return NextResponse.json(collection);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update collection";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.collection.findUnique({ where: { id: params.id }, select: { userId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.userId !== session.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.collection.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
