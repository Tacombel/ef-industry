import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeName } from "@/lib/normalize";
import type { Prisma } from "@prisma/client";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { name, locationIds, itemIds } = await req.json();
  if (name !== undefined && !name?.trim())
    return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const asteroid = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.asteroidType.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name: normalizeName(name) }),
      },
    });

    if (locationIds !== undefined) {
      await tx.asteroidTypeLocation.deleteMany({ where: { asteroidTypeId: params.id } });
      await tx.asteroidTypeLocation.createMany({
        data: (locationIds as string[]).map((locationId) => ({
          asteroidTypeId: params.id,
          locationId,
        })),
      });
    }

    if (itemIds !== undefined) {
      await tx.itemAsteroidType.deleteMany({ where: { asteroidTypeId: params.id } });
      await tx.itemAsteroidType.createMany({
        data: (itemIds as string[]).map((itemId) => ({
          asteroidTypeId: params.id,
          itemId,
        })),
      });
    }

    return tx.asteroidType.findUnique({
      where: { id: updated.id },
      include: {
        locations: { include: { location: true } },
        items: { include: { item: true } },
      },
    });
  });

  return NextResponse.json(asteroid);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.asteroidType.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
