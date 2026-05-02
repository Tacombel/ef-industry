import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculate, buildItemMap } from "@/lib/calculator";
import { fetchCalcItems, enrichAsteroids } from "@/lib/calc-helpers";
import { fetchUserStockMap, fetchStockMapFromAddresses } from "@/lib/sui";
import { getSession } from "@/lib/auth";
import { recordRequest } from "@/lib/metrics";
import { trackEvent } from "@/lib/track";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const t0 = Date.now();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ignoreParam = req.nextUrl.searchParams.get("ignore");
  const ignoredIds = new Set(ignoreParam ? ignoreParam.split(",").filter(Boolean) : []);
  const ssuAddressesParam = req.nextUrl.searchParams.get("ssuAddresses");
  const collectionsCount = Math.max(1, Number(req.nextUrl.searchParams.get("collections") ?? "1") || 1);
  const factoryOverridesParam = req.nextUrl.searchParams.get("factoryOverrides");
  const factoryOverrides = factoryOverridesParam
    ? new Map(factoryOverridesParam.split("|").filter(Boolean).map(s => { const i = s.indexOf(":"); return [s.slice(0, i), s.slice(i + 1)] as [string, string]; }))
    : undefined;
  const refineryOverridesParam = req.nextUrl.searchParams.get("refineryOverrides");
  const refineryOverrides = refineryOverridesParam
    ? new Map(refineryOverridesParam.split("|").filter(Boolean).map(s => { const i = s.indexOf(":"); return [s.slice(0, i), s.slice(i + 1)] as [string, string]; }))
    : undefined;

  const collection = await prisma.collection.findUnique({
    where: { id: params.id },
    include: { items: true },
  });

  if (!collection) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (collection.userId !== session.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (collection.items.length === 0) {
    return NextResponse.json({ rawMaterials: [], intermediates: [], decompositions: [], finalProducts: [], totalRunTime: 0 });
  }

  const stockMap = ssuAddressesParam
    ? await fetchStockMapFromAddresses(ssuAddressesParam.split(",").filter(Boolean))
    : await fetchUserStockMap(session.userId);
  const itemMap = buildItemMap(await fetchCalcItems(stockMap));

  try {
    const collectionItemIds = new Set(collection.items.map((ci) => ci.itemId));
    const activeItems = collection.items.filter((ci) => !ignoredIds.has(ci.itemId));
    const result = calculate(
      activeItems.map((ci) => ({ itemId: ci.itemId, quantity: ci.quantity * collectionsCount })),
      itemMap,
      { factoryOverrides, refineryOverrides }
    );

    result.intermediates = result.intermediates.filter((i) => !collectionItemIds.has(i.itemId));
    result.finalProducts = collection.items.map((ci) => {
      const item = itemMap.get(ci.itemId);
      const overrideFactory = factoryOverrides?.get(ci.itemId);
      const blueprint = overrideFactory
        ? (item?.blueprints.find(b => b.factory === overrideFactory) ?? item?.blueprints.find(b => b.isDefault) ?? item?.blueprints[0])
        : (item?.blueprints.find((b) => b.isDefault) ?? item?.blueprints[0]);
      const outputQty = blueprint?.outputQty ?? 1;
      const totalQty = ci.quantity * collectionsCount;
      return {
        itemId: ci.itemId,
        itemName: item?.name ?? ci.itemId,
        quantityNeeded: totalQty,
        outputQty,
        blueprintRuns: Math.ceil(totalQty / outputQty),
        actualStock: item?.stock ?? 0,
        factory: blueprint?.factory || undefined,
        availableFactories: (item?.blueprints.length ?? 0) > 1 ? item!.blueprints.map(b => b.factory) : undefined,
        blueprintInputs: blueprint?.inputs.map(i => ({ itemId: i.itemId, itemName: itemMap.get(i.itemId)?.name ?? i.itemId, quantity: i.quantity })),
        ignored: ignoredIds.has(ci.itemId),
      };
    });

    await enrichAsteroids(result);

    const ms = Date.now() - t0;
    recordRequest("collections/calculate", ms, true);
    trackEvent({ type: "api", path: "/api/collections/calculate", method: "GET", userId: session.userId, role: session.role, statusCode: 200, ms });
    return NextResponse.json(result);
  } catch (err: unknown) {
    const ms = Date.now() - t0;
    recordRequest("collections/calculate", ms, false);
    trackEvent({ type: "api", path: "/api/collections/calculate", method: "GET", userId: session.userId, role: session.role, statusCode: 422, ms });
    const message = err instanceof Error ? err.message : "Calculation error";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
