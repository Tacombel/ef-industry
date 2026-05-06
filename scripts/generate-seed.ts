/**
 * generate-seed.ts — Merges fresh game data + curated overrides → prisma/seed.json
 *
 * Usage: npx tsx scripts/generate-seed.ts [--src <data_dir>]
 *
 * Data sources (in priority order):
 *   1. Fresh game data from <data_dir>/ (types.json, industry_blueprints.json, industry_facilities.json)
 *   2. Curated data from scripts/curated-data/*.json (flags, asteroids, decompositions, custom items, etc.)
 *
 * The script:
 *   - Reads fresh game data
 *   - Overlays curated boolean flags on items
 *   - Adds custom items/facilities/blueprints not present in game data
 *   - Preserves all curated data (asteroids, decompositions, locations)
 *   - Validates the result before writing
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from "fs";
import { resolve, basename } from "path";

// ── Types ────────────────────────────────────────────────────────────

type SourceType = {
  id: number;
  name: string;
  description?: string;
  mass?: number;
  radius?: number;
  volume?: number;
  portionSize?: number;
  groupName?: string;
  groupId?: number;
  categoryName?: string;
  categoryId?: number;
  iconUrl?: string;
};

type FlagsEntry = {
  typeId: number;
  isRawMaterial: boolean;
  isFound: boolean;
  isFinalProduct: boolean;
  isAsteroid: boolean;
  volume: number;
  description?: string;
  mass?: number;
  radius?: number;
  portionSize?: number;
  groupName?: string;
  groupId?: number;
  categoryName?: string;
  categoryId?: number;
  iconUrl?: string;
};

type SeedItem = FlagsEntry & { name: string };

type Facility = {
  name: string;
  type: "factory" | "refinery";
  typeId: number | null;
};

type BlueprintInput = { typeId: number; quantity: number };
type Blueprint = {
  outputTypeId: number;
  facilityTypeId: number;
  outputQty: number;
  runTime: number;
  inputs: BlueprintInput[];
  blueprintId?: number | null;
  maxInputRuns?: number | null;
  maxOutputRuns?: number | null;
};

type Decomposition = {
  sourceTypeId: number;
  facilityTypeId: number;
  inputQty: number;
  runTime: number;
  outputs: { typeId: number; quantity: number }[];
  blueprintId?: number | null;
  maxInputRuns?: number | null;
  maxOutputRuns?: number | null;
};

type AsteroidType = {
  name: string;
  locations: string[];
  items: number[];
};

type GameBlueprint = {
  inputs: { quantity: number; typeID: number }[];
  outputs: { quantity: number; typeID: number }[];
  primaryTypeID: number;
  runTime: number;
};

type GameFacility = {
  blueprints: { blueprintID: number; maxInputRuns: number; maxOutputRuns: number }[];
  inputCapacity: number;
  outputCapacity: number;
};

type Seed = {
  facilities: Facility[];
  locations: string[];
  items: SeedItem[];
  asteroidTypes: AsteroidType[];
  decompositions: Decomposition[];
  blueprints: Blueprint[];
};

// ── Helpers ──────────────────────────────────────────────────────────

function load<T>(path: string): T {
  const full = resolve(__dirname, "..", path);
  if (!existsSync(full)) throw new Error(`File not found: ${path}`);
  return JSON.parse(readFileSync(full, "utf-8"));
}

function loadCurated<T>(file: string): T {
  return load<T>(`scripts/curated-data/${file}`);
}

// ── Main ─────────────────────────────────────────────────────────────

function main() {
  const srcArg = process.argv.find((a) => a.startsWith("--src="));
  const srcDir = srcArg ? srcArg.replace("--src=", "") : resolve(__dirname, "..", "EF-static");

  console.log(`Source dir: ${srcDir}`);

  // 1. Load fresh game data
  const rawTypes: SourceType[] = load(`${srcDir}/types.json`);
  const rawBlueprints: Record<string, GameBlueprint> = existsSync(resolve(srcDir, "industry_blueprints.json"))
    ? load(`${srcDir}/industry_blueprints.json`)
    : {};
  const rawFacilities: Record<string, GameFacility> = existsSync(resolve(srcDir, "industry_facilities.json"))
    ? load(`${srcDir}/industry_facilities.json`)
    : {};

  // 2. Load curated data
  const flags: FlagsEntry[] = loadCurated("flags.json");
  const locations: string[] = loadCurated("locations.json");
  const asteroids: AsteroidType[] = loadCurated("asteroids.json");
  const decompositions: Decomposition[] = loadCurated("decompositions.json");
  const customFacilities: Facility[] = loadCurated("custom-facilities.json");
  const customItems: (FlagsEntry & { name?: string })[] = loadCurated("custom-items.json");
  const customBlueprints: Blueprint[] = loadCurated("custom-blueprints.json");

  // 3. Build facility info map from ALL known facilities (curated data has correct types)
  const knownFacInfo = new Map<number, { name: string; type: "factory" | "refinery" }>();
  for (const f of [...customFacilities]) {
    if (f.typeId) knownFacInfo.set(f.typeId, { name: f.name, type: f.type });
  }

  // 4. Generate facilities
  const facilities: Facility[] = [...customFacilities];
  // Pre-populate knownFacInfo with refineries from curated decompositions
  for (const tid of decompositions.map((d) => d.facilityTypeId)) {
    if (!knownFacInfo.has(tid)) {
      knownFacInfo.set(tid, { name: `Refinery`, type: "refinery" });
    }
  }
  for (const [tidStr, fac] of Object.entries(rawFacilities)) {
    const tid = Number(tidStr);
    const existing = knownFacInfo.get(tid);
    const name = rawTypes.find((t) => t.id === tid)?.name ?? existing?.name ?? `Facility ${tid}`;
    const type = existing?.type ?? "factory";
    knownFacInfo.set(tid, { name, type });
    facilities.push({ name, type, typeId: tid });
  }

  // 5. Generate items
  const flagsMap = new Map(flags.map((f) => [f.typeId, f]));
  const seenTypes = new Set<number>();
  const items: SeedItem[] = [];

  for (const t of rawTypes) {
    seenTypes.add(t.id);
    const curated = flagsMap.get(t.id);
    items.push({
      typeId: t.id,
      name: t.name,
      isRawMaterial: curated?.isRawMaterial ?? false,
      isFound: curated?.isFound ?? false,
      isFinalProduct: curated?.isFinalProduct ?? false,
      isAsteroid: curated?.isAsteroid ?? false,
      volume: curated?.volume ?? t.volume ?? 0,
      description: curated?.description ?? t.description,
      mass: curated?.mass ?? t.mass,
      radius: curated?.radius ?? t.radius,
      portionSize: curated?.portionSize ?? t.portionSize,
      groupName: curated?.groupName ?? t.groupName,
      groupId: curated?.groupId ?? t.groupId,
      categoryName: curated?.categoryName ?? t.categoryName,
      categoryId: curated?.categoryId ?? t.categoryId,
      iconUrl: curated?.iconUrl ?? t.iconUrl,
    });
  }

  for (const ci of customItems) {
    if (!seenTypes.has(ci.typeId)) {
      seenTypes.add(ci.typeId);
      items.push({
        typeId: ci.typeId,
        name: ci.name ?? `Type ${ci.typeId}`,
        isRawMaterial: ci.isRawMaterial,
        isFound: ci.isFound,
        isFinalProduct: ci.isFinalProduct,
        isAsteroid: ci.isAsteroid,
        volume: ci.volume,
        description: ci.description,
        mass: ci.mass,
        radius: ci.radius,
        portionSize: ci.portionSize,
        groupName: ci.groupName,
        groupId: ci.groupId,
        categoryName: ci.categoryName,
        categoryId: ci.categoryId,
        iconUrl: ci.iconUrl,
      });
    }
  }

  // 6. Generate blueprints (from game data + custom)
  const blueprints: Blueprint[] = [...customBlueprints];

  for (const [ftidStr, fac] of Object.entries(rawFacilities)) {
    const facTypeId = Number(ftidStr);

    // Skip refineries — they are handled as decompositions
    if (knownFacInfo.get(facTypeId)?.type === "refinery") continue;

    for (const entry of fac.blueprints) {
      const bp = rawBlueprints[entry.blueprintID];
      if (!bp) {
        console.warn(`  ⚠ Facility ${ftidStr}: blueprint ${entry.blueprintID} not found, skipping`);
        continue;
      }

      blueprints.push({
        outputTypeId: bp.primaryTypeID,
        facilityTypeId: facTypeId,
        outputQty: bp.outputs[0]?.quantity ?? 1,
        runTime: bp.runTime,
        inputs: bp.inputs.map((i) => ({ typeId: i.typeID, quantity: i.quantity })),
        blueprintId: entry.blueprintID,
        maxInputRuns: entry.maxInputRuns,
        maxOutputRuns: entry.maxOutputRuns,
      });
    }
  }

  // 7. Validate: check that all TypeIDs referenced in blueprints/decomps exist in items
  const itemTypeIds = new Set(items.map((i) => i.typeId));
  const missing = new Set<number>();

  for (const bp of blueprints) {
    if (!itemTypeIds.has(bp.outputTypeId)) missing.add(bp.outputTypeId);
    for (const inp of bp.inputs) {
      if (!itemTypeIds.has(inp.typeId)) missing.add(inp.typeId);
    }
  }
  for (const d of decompositions) {
    if (!itemTypeIds.has(d.sourceTypeId)) missing.add(d.sourceTypeId);
    for (const o of d.outputs) {
      if (!itemTypeIds.has(o.typeId)) missing.add(o.typeId);
    }
  }

  // Auto-add missing items (so validation always passes)
  const autoAdded: number[] = [];
  for (const tid of missing) {
    if (!itemTypeIds.has(tid)) {
      items.push({
        typeId: tid,
        name: `Type ${tid}`,
        isRawMaterial: false,
        isFound: false,
        isFinalProduct: false,
        isAsteroid: false,
        volume: 0,
      });
      itemTypeIds.add(tid);
      autoAdded.push(tid);
    }
  }
  if (autoAdded.length > 0) {
    console.log(`  ℹ Auto-added ${autoAdded.length} missing TypeIDs to items: ${autoAdded.join(", ")}`);
  }

  // 8. Build final seed
  const seed: Seed = {
    facilities,
    locations,
    items,
    asteroidTypes: asteroids,
    decompositions,
    blueprints,
  };

  // 9. Validate minimums
  const counts = {
    facilities: seed.facilities.length,
    locations: seed.locations.length,
    items: seed.items.length,
    asteroidTypes: seed.asteroidTypes.length,
    decompositions: seed.decompositions.length,
    blueprints: seed.blueprints.length,
  };

  const MINIMUMS = {
    facilities: 5,
    locations: 5,
    items: 50,
    asteroidTypes: 1,
    decompositions: 1,
    blueprints: 1,
  };

  const failures = (Object.keys(MINIMUMS) as (keyof typeof MINIMUMS)[]).filter(
    (key) => counts[key] < MINIMUMS[key]
  );

  if (failures.length > 0) {
    console.error("❌ Validation failed — counts below minimums:");
    for (const key of failures) {
      console.error(`   ${key}: got ${counts[key]}, expected at least ${MINIMUMS[key]}`);
    }
    process.exit(1);
  }

  // 10. Write seed.json with backup
  const seedPath = resolve(__dirname, "..", "prisma", "seed.json");
  const backupPath = resolve(__dirname, "..", "prisma", "seed.json.bak");

  if (existsSync(seedPath)) {
    copyFileSync(seedPath, backupPath);
    console.log(`  ✓ Backup saved to prisma/seed.json.bak`);
  }

  writeFileSync(seedPath, JSON.stringify(seed, null, 2) + "\n", "utf-8");

  console.log(`\n✓ seed.json generated (${Object.values(counts).reduce((a, b) => a + b, 0)} total records)`);
  console.log(`  Facilities: ${counts.facilities}`);
  console.log(`  Locations: ${counts.locations}`);
  console.log(`  Items: ${counts.items}`);
  console.log(`  Asteroid types: ${counts.asteroidTypes}`);
  console.log(`  Decompositions: ${counts.decompositions}`);
  console.log(`  Blueprints: ${counts.blueprints}`);
  console.log("Done.");
}

main();
