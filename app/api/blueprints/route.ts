import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const blueprints = await prisma.blueprint.findMany({
    include: {
      outputItem: true,
      inputs: { include: { item: true } },
    },
    orderBy: [{ outputItem: { name: "asc" } }, { factory: "asc" }],
  });
  return NextResponse.json(blueprints);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { outputItemId, factory = "", outputQty = 1, isDefault = false, inputs = [] } = body;

  if (!outputItemId) {
    return NextResponse.json({ error: "outputItemId is required" }, { status: 400 });
  }

  const blueprint = await prisma.$transaction(async (tx) => {
    // If this is set as default, unset any existing default for this item
    if (isDefault) {
      await tx.blueprint.updateMany({
        where: { outputItemId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // If this is the first blueprint for the item, auto-set as default
    const existingCount = await tx.blueprint.count({ where: { outputItemId } });
    const shouldBeDefault = isDefault || existingCount === 0;

    return tx.blueprint.create({
      data: {
        outputItemId,
        factory,
        outputQty,
        isDefault: shouldBeDefault,
        inputs: {
          create: inputs.map((i: { itemId: string; quantity: number }) => ({
            itemId: i.itemId,
            quantity: i.quantity,
          })),
        },
      },
      include: {
        outputItem: true,
        inputs: { include: { item: true } },
      },
    });
  });

  return NextResponse.json(blueprint, { status: 201 });
}
