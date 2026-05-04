import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeName } from "@/lib/normalize";
import { requireAdmin } from "@/lib/auth";
import { requireDev } from "@/lib/dev-guard";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? "0") || 0;
  const offset = Number(searchParams.get("offset") ?? "0");

  const blueprints = await prisma.blueprint.findMany({
    include: {
      outputItem: true,
      inputs: { include: { item: true } },
    },
    orderBy: [{ outputItem: { name: "asc" } }, { factory: "asc" }],
    ...(limit > 0 ? { take: Math.min(limit, 500), skip: offset } : {}),
  });
  return NextResponse.json(blueprints);
}

export async function POST(req: NextRequest) {
  const devError = requireDev();
  if (devError) return devError;
  const authError = await requireAdmin();
  if (authError) return authError;

  const body = await req.json();
  const { outputItemId, factory = "", outputQty = 1, isDefault = false, inputs = [] } = body;
  const normalizedFactory = normalizeName(factory);

  if (!outputItemId) {
    return NextResponse.json({ error: "outputItemId is required" }, { status: 400 });
  }
  if (!Number.isInteger(outputQty) || outputQty < 1) {
    return NextResponse.json({ error: "outputQty must be a positive integer" }, { status: 400 });
  }
  if (inputs.some((i: { itemId: string; quantity: number }) => !i.itemId || !Number.isInteger(i.quantity) || i.quantity < 1)) {
    return NextResponse.json({ error: "Each input must have a valid itemId and quantity >= 1" }, { status: 400 });
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
        factory: normalizedFactory,
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
