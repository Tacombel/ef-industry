import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculate, buildItemMap, CalcItem } from "@/lib/calculator";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const pack = await prisma.pack.findUnique({
    where: { id: params.id },
    include: { items: true },
  });
  if (!pack) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (pack.items.length === 0) return NextResponse.json({ error: "Pack has no items" }, { status: 400 });

  const allItems = await prisma.item.findMany({
    include: {
      stock: true,
      blueprints: { include: { inputs: { select: { itemId: true, quantity: true } } }, orderBy: { isDefault: "desc" } },
      decomposition: { include: { outputs: { select: { itemId: true, quantity: true } } } },
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
  const packItemIds = new Set(pack.items.map((pi) => pi.itemId));

  let result;
  try {
    result = calculate(
      pack.items.map((pi) => ({ itemId: pi.itemId, quantity: pi.quantity })),
      itemMap
    );
    result.intermediates = result.intermediates.filter((i) => !packItemIds.has(i.itemId));
    result.finalProducts = pack.items.map((pi) => {
      const item = itemMap.get(pi.itemId);
      return {
        itemId: pi.itemId,
        itemName: item?.name ?? pi.itemId,
        quantityNeeded: pi.quantity,
        actualStock: item?.stock ?? 0,
      };
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Calculation error";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  // Build stock deltas
  const deltas = new Map<string, number>(); // itemId → delta

  for (const r of result.rawMaterials) {
    if (r.inStock > 0) deltas.set(r.itemId, (deltas.get(r.itemId) ?? 0) - r.inStock);
  }
  for (const i of result.intermediates) {
    if (i.inStock > 0) deltas.set(i.itemId, (deltas.get(i.itemId) ?? 0) - i.inStock);
  }
  for (const d of result.decompositions) {
    if (d.unitsToDecompose > 0) deltas.set(d.sourceItemId, (deltas.get(d.sourceItemId) ?? 0) - d.unitsToDecompose);
  }
  for (const fp of result.finalProducts) {
    if (fp.quantityNeeded > 0) deltas.set(fp.itemId, (deltas.get(fp.itemId) ?? 0) + fp.quantityNeeded);
  }

  // Apply deltas in a single transaction
  await prisma.$transaction(
    [...deltas.entries()].map(([itemId, delta]) =>
      prisma.stock.upsert({
        where: { itemId },
        update: { quantity: { increment: delta } },
        create: { itemId, quantity: Math.max(0, delta) },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
