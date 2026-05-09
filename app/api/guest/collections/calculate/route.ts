import { NextRequest, NextResponse } from "next/server";
import { calculate, buildItemMap } from "@/lib/calculator";
import { fetchCalcItems, enrichAsteroids } from "@/lib/calc-helpers";
import { fetchStockMapFromAddresses } from "@/lib/sui";
import { trackEvent } from "@/lib/track";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const items: { itemId: string; quantity: number }[] = body?.items ?? [];
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ rawMaterials: [], intermediates: [], decompositions: [], finalProducts: [], totalRunTime: 0 });
  }

  const excludedOres = req.nextUrl.searchParams.get("excludedOres");
  const excludedOreIds = excludedOres ? new Set(excludedOres.split(",").filter(Boolean)) : undefined;
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

  const stockMap = ssuAddressesParam
    ? await fetchStockMapFromAddresses(ssuAddressesParam.split(",").filter(Boolean))
    : new Map<string, number>();
  const itemMap = buildItemMap(await fetchCalcItems(stockMap));

  try {
    const collectionItemIds = new Set(items.map((ci) => ci.itemId));
    const activeItems = items.filter((ci) => !ignoredIds.has(ci.itemId));
    const result = calculate(
      activeItems.map((ci) => ({ itemId: ci.itemId, quantity: ci.quantity * collectionsCount })),
      itemMap,
      { excludedOreIds, factoryOverrides, refineryOverrides }
    );

    result.intermediates = result.intermediates.filter((i) => !collectionItemIds.has(i.itemId));
    result.finalProducts = items.map((ci) => {
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
        blueprintsByFactory: (item?.blueprints.length ?? 0) > 1 ? Object.fromEntries(item!.blueprints.map(b => [b.factory, { inputs: b.inputs.map(i => ({ itemId: i.itemId, itemName: itemMap.get(i.itemId)?.name ?? i.itemId, quantity: i.quantity })), outputQty: b.outputQty }])) : undefined,
        ignored: ignoredIds.has(ci.itemId),
      };
    });

    await enrichAsteroids(result);
    trackEvent({ type: "api", path: "/browse/calculate", statusCode: 200 });
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Calculation error";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
