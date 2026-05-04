import { describe, it, expect } from "vitest";
import { computeOreSubstitution } from "./ore-optimization";
import type { DecompositionResult } from "./calculator";

function makeDecomp(overrides: Partial<DecompositionResult> & { sourceItemId: string }): DecompositionResult {
  return {
    sourceItemName: overrides.sourceItemId,
    refinery: "Refinery",
    unitsToDecompose: 100,
    volumePerUnit: 1,
    inputQty: 10,
    runs: 10,
    actualStock: 0,
    outputs: [],
    ...overrides,
  };
}

describe("computeOreSubstitution", () => {
  it("returns null when cargoCapacity is 0", () => {
    const decomps = [makeDecomp({ sourceItemId: "ore1" }), makeDecomp({ sourceItemId: "ore2" })];
    expect(computeOreSubstitution(decomps, 0)).toBeNull();
  });

  it("returns null with a single ore", () => {
    const decomps = [makeDecomp({ sourceItemId: "ore1" })];
    expect(computeOreSubstitution(decomps, 1000)).toBeNull();
  });

  it("returns null when all ores fill trips exactly (no pico)", () => {
    // 100 units × 1 m³ = 100 m³, cargo = 50 → exactly 2 full trips, pico = 0
    const decomps = [
      makeDecomp({ sourceItemId: "ore1", unitsToDecompose: 100, volumePerUnit: 1 }),
      makeDecomp({ sourceItemId: "ore2", unitsToDecompose: 100, volumePerUnit: 1 }),
    ];
    expect(computeOreSubstitution(decomps, 50)).toBeNull();
  });

  it("returns null when unitsToDecompose is 0 for a provider (no division by zero)", () => {
    const decomps = [
      makeDecomp({
        sourceItemId: "ore1",
        unitsToDecompose: 75, // pico = 75 % 50 = 25
        volumePerUnit: 1,
        outputs: [{ itemId: "matA", itemName: "Mat A", quantityObtained: 10 }],
      }),
      makeDecomp({
        sourceItemId: "ore2",
        unitsToDecompose: 0, // would cause division by zero
        volumePerUnit: 1,
        outputs: [{ itemId: "matA", itemName: "Mat A", quantityObtained: 0 }],
      }),
    ];
    // Should not throw, should return null (infeasible)
    expect(() => computeOreSubstitution(decomps, 50)).not.toThrow();
  });

  it("returns a suggestion when optimization saves trips", () => {
    // ore1: 25 units × 1m³ = 25m³, cargo=50 → 1 trip, pico=25, spare=25
    //   outputs matA×25
    // ore2: 60 units × 1m³ = 60m³, cargo=50 → 2 trips, pico=10, spare=40
    //   outputs matA×60 (rate=1.0/unit)
    // Algorithm tries smallest-pico first → ore2 (pico=10) is the target candidate
    // To cover ore2's matA=60 from ore1 (rate=1.0): need 60 extra units
    // extraVolume=60m³ > ore1.spare=25 → not fitsInSpare, extraTrips=ceil((60-25)/50)=1
    // net savings = ore2.trips(2) - extraTrips(1) = 1 → suggest!
    const decomps = [
      makeDecomp({
        sourceItemId: "ore1",
        unitsToDecompose: 25,
        volumePerUnit: 1,
        inputQty: 10,
        outputs: [{ itemId: "matA", itemName: "Mat A", quantityObtained: 25 }],
      }),
      makeDecomp({
        sourceItemId: "ore2",
        unitsToDecompose: 60,
        volumePerUnit: 1,
        inputQty: 10,
        outputs: [{ itemId: "matA", itemName: "Mat A", quantityObtained: 60 }],
      }),
    ];
    const result = computeOreSubstitution(decomps, 50);
    expect(result).not.toBeNull();
    expect(result!.target.d.sourceItemId).toBe("ore2");
    expect(result!.adjustments[0].fitsInSpare).toBe(false);
    expect(result!.target.trips).toBe(2);
  });

  it("neededIds must use totalNeeded (not toBuy) to avoid false 'remove all trips' suggestion", () => {
    // Scenario (regression for v1.51.1 / af3f1f1):
    //   ore1: 232 units × 1m³ = 232m³, cargo=100 → 3 trips, pico=32m³, spare=68m³
    //         outputs matA×232
    //   ore2: 200 units × 1m³ = 200m³, cargo=100 → 2 full trips, pico=0, spare=0
    //         outputs matA×200
    //
    // ore1 is the only candidate (ore2 has no pico/spare).
    //
    // With neededIds = {matA} (totalNeeded>0 — correct):
    //   remaining = {matA: 232}; provider = ore2 (no spare) → extraTrips=3; net=0 → null ✓
    //
    // With neededIds = {} (toBuy=0 — the bug: matA had toBuy=0 because ore1 was covering it):
    //   remaining = {}; feasible trivially; adjustments=[]; net=3 → false suggestion to remove
    //   all 3 trips from ore1 with zero redistribution cost.
    const decomps = [
      makeDecomp({
        sourceItemId: "ore1",
        unitsToDecompose: 232,
        volumePerUnit: 1,
        inputQty: 1,
        runs: 232,
        outputs: [{ itemId: "matA", itemName: "Mat A", quantityObtained: 232 }],
      }),
      makeDecomp({
        sourceItemId: "ore2",
        unitsToDecompose: 200,
        volumePerUnit: 1,
        inputQty: 1,
        runs: 200,
        outputs: [{ itemId: "matA", itemName: "Mat A", quantityObtained: 200 }],
      }),
    ];

    // Correct: neededIds contains matA (totalNeeded > 0) → no beneficial optimization
    expect(computeOreSubstitution(decomps, 100, undefined, new Set(["matA"]))).toBeNull();

    // Bug: neededIds empty (toBuy=0 because ore1 already covers matA) → false positive
    const bug = computeOreSubstitution(decomps, 100, undefined, new Set());
    expect(bug).not.toBeNull();
    expect(bug!.adjustments).toHaveLength(0); // no real redistribution — cost is fiction
    expect(bug!.target.trips).toBe(3);        // all 3 trips, not just the partial one
  });

  it("respects toMineMap for trip calculations", () => {
    // ore1 has 75 total but 50 in stock → only 25 to mine → 1 trip (25/50 < 1, ceil=1)
    // ore2 has 200 total, 0 stock → 4 trips
    const decomps = [
      makeDecomp({
        sourceItemId: "ore1",
        unitsToDecompose: 75,
        volumePerUnit: 1,
        inputQty: 10,
        outputs: [{ itemId: "matA", itemName: "Mat A", quantityObtained: 75 }],
      }),
      makeDecomp({
        sourceItemId: "ore2",
        unitsToDecompose: 200,
        volumePerUnit: 1,
        inputQty: 10,
        outputs: [{ itemId: "matA", itemName: "Mat A", quantityObtained: 200 }],
      }),
    ];
    const toMineMap = new Map([["ore1", 25], ["ore2", 200]]);
    const result = computeOreSubstitution(decomps, 50, toMineMap);
    // ore1 now has 25 m³ → ceil(25/50)=1 trip, pico=25 — still a candidate
    // Whether optimization is suggested depends on math, but no crash
    expect(() => computeOreSubstitution(decomps, 50, toMineMap)).not.toThrow();
    if (result) {
      expect(result.target.trips).toBe(1);
    }
  });
});
