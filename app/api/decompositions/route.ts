import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeName } from "@/lib/normalize";
import { requireAdmin } from "@/lib/auth";
import { requireDev } from "@/lib/dev-guard";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? "0") || 0;
  const offset = Number(searchParams.get("offset") ?? "0");

  const decompositions = await prisma.decomposition.findMany({
    include: {
      sourceItem: true,
      inputs: { include: { item: true } },
      outputs: { include: { item: true } },
    },
    orderBy: [{ sourceItem: { name: "asc" } }, { refinery: "asc" }],
    ...(limit > 0 ? { take: Math.min(limit, 500), skip: offset } : {}),
  });
  return NextResponse.json(decompositions);
}

export async function POST(req: NextRequest) {
  const devError = requireDev();
  if (devError) return devError;
  const authError = await requireAdmin();
  if (authError) return authError;

  const body = await req.json();
  const { sourceItemId, primaryTypeId, refinery = "", inputs = [], isDefault = false, outputs = [] } = body;

  if (!sourceItemId) {
    return NextResponse.json({ error: "sourceItemId is required" }, { status: 400 });
  }
  if (outputs.length === 0) {
    return NextResponse.json({ error: "At least one output is required" }, { status: 400 });
  }
  if (outputs.some((o: { itemId: string; quantity: number }) => !o.itemId || !Number.isInteger(o.quantity) || o.quantity < 1)) {
    return NextResponse.json({ error: "Each output must have a valid itemId and quantity >= 1" }, { status: 400 });
  }

  const normalizedRefinery = normalizeName(refinery);

  const decomposition = await prisma.$transaction(async (tx) => {
    // If set as default, unset existing default for this source item
    if (isDefault) {
      await tx.decomposition.updateMany({
        where: { sourceItemId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // If this is the first decomposition for the item, auto-set as default
    const existingCount = await tx.decomposition.count({ where: { sourceItemId } });
    const shouldBeDefault = isDefault || existingCount === 0;

    return tx.decomposition.create({
      data: {
        sourceItemId,
        primaryTypeId,
        refinery: normalizedRefinery,
        isDefault: shouldBeDefault,
        inputs: {
          create: inputs.map((i: { itemId: string; quantity: number }) => ({
            itemId: i.itemId,
            quantity: i.quantity,
          })),
        },
        outputs: {
          create: outputs.map((o: { itemId: string; quantity: number }) => ({
            itemId: o.itemId,
            quantity: o.quantity,
          })),
        },
      },
      include: {
        sourceItem: true,
        outputs: { include: { item: true } },
      },
    });
  });

  return NextResponse.json(decomposition, { status: 201 });
}
