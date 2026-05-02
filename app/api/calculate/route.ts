import { NextRequest, NextResponse } from "next/server";
import { calculate, buildItemMap } from "@/lib/calculator";
import { fetchCalcItems, enrichAsteroids } from "@/lib/calc-helpers";
import { fetchUserStockMap, fetchStockMapFromAddresses } from "@/lib/sui";
import { getSession } from "@/lib/auth";
import { recordRequest } from "@/lib/metrics";
import { trackEvent } from "@/lib/track";

export async function GET(req: NextRequest) {
  const t0 = Date.now();
  const itemId = req.nextUrl.searchParams.get("itemId");
  const units = Number(req.nextUrl.searchParams.get("units") ?? "1");
  const excludedOres = req.nextUrl.searchParams.get("excludedOres");
  const excludedOreIds = excludedOres ? new Set(excludedOres.split(",").filter(Boolean)) : undefined;

  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });
  if (!Number.isInteger(units) || units < 1) return NextResponse.json({ error: "units must be a positive integer" }, { status: 400 });

  const factoryOverridesParam = req.nextUrl.searchParams.get("factoryOverrides");
  const factoryOverrides = factoryOverridesParam
    ? new Map(factoryOverridesParam.split("|").filter(Boolean).map(s => { const i = s.indexOf(":"); return [s.slice(0, i), s.slice(i + 1)] as [string, string]; }))
    : undefined;
  const refineryOverridesParam = req.nextUrl.searchParams.get("refineryOverrides");
  const refineryOverrides = refineryOverridesParam
    ? new Map(refineryOverridesParam.split("|").filter(Boolean).map(s => { const i = s.indexOf(":"); return [s.slice(0, i), s.slice(i + 1)] as [string, string]; }))
    : undefined;

  const ssuAddressesParam = req.nextUrl.searchParams.get("ssuAddresses");
  const session = await getSession();
  const stockMap = ssuAddressesParam
    ? await fetchStockMapFromAddresses(ssuAddressesParam.split(",").filter(Boolean))
    : session
    ? await fetchUserStockMap(session.userId)
    : new Map<string, number>();
  const itemMap = buildItemMap(await fetchCalcItems(stockMap));

  try {
    const outputItem = itemMap.get(itemId);
    const overrideFactory = factoryOverrides?.get(itemId);
    const blueprint = overrideFactory
      ? (outputItem?.blueprints.find(b => b.factory === overrideFactory) ?? outputItem?.blueprints.find(b => b.isDefault) ?? outputItem?.blueprints[0])
      : (outputItem?.blueprints.find((b) => b.isDefault) ?? outputItem?.blueprints[0]);
    const outputQty = blueprint?.outputQty ?? 1;
    const runs = Math.ceil(units / outputQty);
    const quantity = runs * outputQty;

    const result = calculate([{ itemId, quantity }], itemMap, { excludedOreIds, factoryOverrides, refineryOverrides });

    // Move the output item from intermediates to finalProducts
    result.intermediates = result.intermediates.filter((i) => i.itemId !== itemId);
    result.finalProducts = [
      {
        itemId,
        itemName: outputItem?.name ?? itemId,
        quantityNeeded: units,
        outputQty,
        blueprintRuns: runs,
        actualStock: outputItem?.stock ?? 0,
        factory: blueprint?.factory || undefined,
        availableFactories: (outputItem?.blueprints.length ?? 0) > 1 ? outputItem!.blueprints.map(b => b.factory) : undefined,
        blueprintInputs: blueprint?.inputs.map(i => ({ itemId: i.itemId, itemName: itemMap.get(i.itemId)?.name ?? i.itemId, quantity: i.quantity })),
        ignored: false,
      },
    ];

    await enrichAsteroids(result);

    const ms = Date.now() - t0;
    recordRequest("calculate", ms, true);
    trackEvent({ type: "api", path: "/api/calculate", method: "GET", userId: session?.userId, role: session?.role, statusCode: 200, ms });
    return NextResponse.json(result);
  } catch (err: unknown) {
    const ms = Date.now() - t0;
    recordRequest("calculate", ms, false);
    trackEvent({ type: "api", path: "/api/calculate", method: "GET", userId: session?.userId, role: session?.role, statusCode: 422, ms });
    const message = err instanceof Error ? err.message : "Calculation error";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
