import { describe, it, expect, beforeAll } from "vitest";
import { fetchCalcItems } from "@/lib/calc-helpers";
import { calculate, buildItemMap } from "@/lib/calculator";
import type { CalcItem } from "@/lib/calculator";

// Integration tests — hit the real SQLite DB to verify all 21 multi-factory items

describe("multi-factory items (real DB)", () => {
  let itemMap: ReturnType<typeof buildItemMap>;
  let multiFactoryItems: CalcItem[];

  beforeAll(async () => {
    const items = await fetchCalcItems();
    itemMap = buildItemMap(items);
    multiFactoryItems = items.filter((item) => item.blueprints.length >= 2);
  });

  it("seed contains the expected number of multi-factory items", () => {
    expect(multiFactoryItems.length).toBe(23);
  });

  it("availableFactories populated correctly for all multi-factory items", () => {
    for (const item of multiFactoryItems) {
      const result = calculate([{ itemId: item.id, quantity: 1 }], itemMap);
      const inter = result.intermediates.find((i) => i.itemId === item.id);
      expect(inter, `${item.name} should appear in intermediates`).toBeDefined();
      expect(
        inter!.availableFactories,
        `${item.name} should have availableFactories`
      ).toEqual(item.blueprints.map((b) => b.factory));
    }
  });

  it("factory override changes the selected factory for all multi-factory items", () => {
    for (const item of multiFactoryItems) {
      const defaultBp = item.blueprints.find((b) => b.isDefault) ?? item.blueprints[0];

      for (const bp of item.blueprints) {
        if (bp.factory === defaultBp.factory) continue;

        const overrides = new Map([[item.id, bp.factory]]);
        const result = calculate(
          [{ itemId: item.id, quantity: 10 }],
          itemMap,
          { factoryOverrides: overrides }
        );

        const inter = result.intermediates.find((i) => i.itemId === item.id);
        expect(inter, `${item.name}: intermediate should exist with override`).toBeDefined();
        expect(
          inter!.factory,
          `${item.name}: factory should switch to ${bp.factory}`
        ).toBe(bp.factory);
      }
    }
  });

  it("switching factory changes raw materials when blueprints have different inputs", () => {
    for (const item of multiFactoryItems) {
      const defaultBp = item.blueprints.find((b) => b.isDefault) ?? item.blueprints[0];
      const defaultInputIds = new Set(defaultBp.inputs.map((i) => i.itemId));

      for (const bp of item.blueprints) {
        if (bp.factory === defaultBp.factory) continue;

        const altInputIds = new Set(bp.inputs.map((i) => i.itemId));
        const inputsDiffer =
          [...defaultInputIds].some((id) => !altInputIds.has(id)) ||
          [...altInputIds].some((id) => !defaultInputIds.has(id));
        if (!inputsDiffer) continue; // same recipe in both factories — skip raw materials check

        const defaultResult = calculate([{ itemId: item.id, quantity: 10 }], itemMap);
        const defaultMatIds = new Set(defaultResult.rawMaterials.map((r) => r.itemId));

        const overrides = new Map([[item.id, bp.factory]]);
        const altResult = calculate(
          [{ itemId: item.id, quantity: 10 }],
          itemMap,
          { factoryOverrides: overrides }
        );
        const altMatIds = new Set(altResult.rawMaterials.map((r) => r.itemId));

        const changed =
          [...defaultMatIds].some((id) => !altMatIds.has(id)) ||
          [...altMatIds].some((id) => !defaultMatIds.has(id));

        expect(
          changed,
          `${item.name}: switching from ${defaultBp.factory} to ${bp.factory} should change raw materials`
        ).toBe(true);
      }
    }
  });
});
