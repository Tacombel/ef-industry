import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculate, buildItemMap, CalcItem } from "@/lib/calculator";

export async function GET(req: NextRequest) {
  const itemId = req.nextUrl.searchParams.get("itemId");
  const quantity = Number(req.nextUrl.searchParams.get("quantity") ?? "1");

  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });
  if (quantity < 1) return NextResponse.json({ error: "quantity must be >= 1" }, { status: 400 });

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

  try {
    const result = calculate([{ itemId, quantity }], itemMap);

    // Move the output item from intermediates to finalProducts
    result.intermediates = result.intermediates.filter((i) => i.itemId !== itemId);
    const outputItem = itemMap.get(itemId);
    const blueprint = outputItem?.blueprints.find((b) => b.isDefault) ?? outputItem?.blueprints[0];
    result.finalProducts = [
      {
        itemId,
        itemName: outputItem?.name ?? itemId,
        quantityNeeded: quantity,
        actualStock: outputItem?.stock ?? 0,
        factory: blueprint?.factory || undefined,
        ignored: false,
      },
    ];

    // Enrich ore items with asteroid data
    const directOreIds = result.rawMaterials.filter((r) => r.isRawMaterial).map((r) => r.itemId);
    const allOreIds = [...result.decompositions.map((d) => d.sourceItemId), ...directOreIds];
    if (allOreIds.length > 0) {
      const asteroidData = await prisma.itemAsteroidType.findMany({
        where: { itemId: { in: allOreIds } },
        include: {
          asteroidType: {
            include: { locations: { include: { location: true } } },
          },
        },
      });
      const asteroidsByItem = new Map<string, { name: string; locations: string[] }[]>();
      for (const row of asteroidData) {
        const list = asteroidsByItem.get(row.itemId) ?? [];
        list.push({
          name: row.asteroidType.name,
          locations: row.asteroidType.locations.map((l) => l.location.name),
        });
        asteroidsByItem.set(row.itemId, list);
      }
      for (const d of result.decompositions) {
        const info = asteroidsByItem.get(d.sourceItemId);
        if (info) d.asteroids = info;
      }
      for (const r of result.rawMaterials) {
        if (r.isRawMaterial) {
          const info = asteroidsByItem.get(r.itemId);
          if (info) r.asteroids = info;
        }
      }
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Calculation error";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
