import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculate, buildItemMap, CalcItem } from "@/lib/calculator";

export async function POST(req: NextRequest) {
  const { itemId, quantity } = await req.json();
  if (!itemId || !quantity) {
    return NextResponse.json({ error: "itemId and quantity required" }, { status: 400 });
  }

  const allItems = await prisma.item.findMany({
    include: {
      stock: true,
      blueprints: {
        include: { inputs: { select: { itemId: true, quantity: true } } },
        orderBy: { isDefault: "desc" },
      },
      decomposition: {
        include: { outputs: { select: { itemId: true, quantity: true } } },
      },
    },
  });

  const calcItems: CalcItem[] = allItems.map((item) => ({
    id: item.id,
    name: item.name,
    isRawMaterial: item.isRawMaterial,
    isFound: item.isFound,
    stock: item.stock?.quantity ?? 0,
    blueprints: item.blueprints.map((bp) => ({
      id: bp.id,
      outputQty: bp.outputQty,
      factory: bp.factory,
      isDefault: bp.isDefault,
      inputs: bp.inputs,
    })),
    decomposition: item.decomposition
      ? { inputQty: item.decomposition.inputQty, outputs: item.decomposition.outputs }
      : null,
  }));

  const itemMap = buildItemMap(calcItems);

  let result;
  try {
    result = calculate([{ itemId, quantity }], itemMap);
    result.intermediates = result.intermediates.filter((i) => i.itemId !== itemId);
    const outputItem = itemMap.get(itemId);
    result.finalProducts = [
      {
        itemId,
        itemName: outputItem?.name ?? itemId,
        quantityNeeded: quantity,
        actualStock: outputItem?.stock ?? 0,
      },
    ];
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Calculation error";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  // Build stock deltas
  const deltas = new Map<string, number>();

  for (const r of result.rawMaterials) {
    if (r.inStock > 0) deltas.set(r.itemId, (deltas.get(r.itemId) ?? 0) - r.inStock);
  }
  for (const i of result.intermediates) {
    if (i.inStock > 0) deltas.set(i.itemId, (deltas.get(i.itemId) ?? 0) - i.inStock);
  }
  for (const d of result.decompositions) {
    if (d.unitsToDecompose > 0) {
      deltas.set(d.sourceItemId, (deltas.get(d.sourceItemId) ?? 0) - d.unitsToDecompose);
    }
  }
  for (const fp of result.finalProducts) {
    if (fp.quantityNeeded > 0) {
      deltas.set(fp.itemId, (deltas.get(fp.itemId) ?? 0) + fp.quantityNeeded);
    }
  }

  await prisma.$transaction(
    [...deltas.entries()].map(([id, delta]) =>
      prisma.stock.upsert({
        where: { itemId: id },
        update: { quantity: { increment: delta } },
        create: { itemId: id, quantity: Math.max(0, delta) },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
