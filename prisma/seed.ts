import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import data from "./seed.json";

type SeedItem = {
  name: string;
  typeId: number;
  isRawMaterial: boolean;
  isFound: boolean;
  isFinalProduct: boolean;
  isAsteroid?: boolean;
  volume?: number;
};

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Facilities
  const factories = data.facilities.filter((f) => f.type === "factory");
  const refineries = data.facilities.filter((f) => f.type === "refinery");
  for (const f of factories) {
    await prisma.factory.upsert({ where: { name: f.name }, update: { typeId: f.typeId ?? null }, create: { name: f.name, typeId: f.typeId ?? null } });
  }
  for (const r of refineries) {
    await prisma.refinery.upsert({ where: { name: r.name }, update: { typeId: r.typeId ?? null }, create: { name: r.name, typeId: r.typeId ?? null } });
  }
  console.log(`  ✓ ${factories.length} factories, ${refineries.length} refineries`);

  // Locations
  for (const name of data.locations) {
    await prisma.location.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log(`  ✓ ${data.locations.length} locations`);

  // Items
  for (const item of data.items as SeedItem[]) {
    await prisma.item.upsert({
      where: { typeId: item.typeId },
      update: {
        name: item.name,
        isRawMaterial: item.isRawMaterial,
        isFound: item.isFound,
        isFinalProduct: item.isFinalProduct,
        isAsteroid: item.isAsteroid ?? false,
        volume: item.volume ?? 0,
      },
      create: { ...item, volume: item.volume ?? 0 },
    });
  }
  console.log(`  ✓ ${data.items.length} items`);

  // Build lookup maps (loaded after items are seeded)
  const allItems = await prisma.item.findMany({ select: { id: true, typeId: true } });
  const itemIdByTypeId = new Map(allItems.map((i) => [i.typeId, i.id]));

  const allFactories = await prisma.factory.findMany({ select: { id: true, name: true, typeId: true } });
  const factoryNameByTypeId = new Map(allFactories.map((f) => [f.typeId, f.name]));

  const allRefineries = await prisma.refinery.findMany({ select: { id: true, name: true, typeId: true } });
  const refineryNameByTypeId = new Map(allRefineries.map((r) => [r.typeId, r.name]));

  // Asteroid types
  for (const at of data.asteroidTypes) {
    const created = await prisma.asteroidType.upsert({ where: { name: at.name }, update: {}, create: { name: at.name } });
    for (const locName of at.locations) {
      const loc = await prisma.location.findUnique({ where: { name: locName } });
      if (loc) {
        await prisma.asteroidTypeLocation.upsert({
          where: { asteroidTypeId_locationId: { asteroidTypeId: created.id, locationId: loc.id } },
          update: {},
          create: { asteroidTypeId: created.id, locationId: loc.id },
        });
      }
    }
    for (const typeId of at.items) {
      const itemId = itemIdByTypeId.get(typeId);
      if (itemId) {
        await prisma.itemAsteroidType.upsert({
          where: { itemId_asteroidTypeId: { itemId, asteroidTypeId: created.id } },
          update: {},
          create: { itemId, asteroidTypeId: created.id },
        });
      } else {
        console.warn(`  ⚠ Item typeId ${typeId} not found for asteroidType: ${at.name}`);
      }
    }
  }
  console.log(`  ✓ ${data.asteroidTypes.length} asteroid types`);

  // Decompositions: wipe and recreate to avoid duplicates with NULL blueprintId
  // (SQLite unique constraints don't treat NULL=NULL, so upsert creates duplicates on each run)
  const existingDefaults = await prisma.decomposition.findMany({
    where: { isDefault: true },
    select: { sourceItemId: true, refinery: true, blueprintId: true },
  });
  const defaultKeys = new Set(existingDefaults.map((d) => `${d.sourceItemId}||${d.refinery}||${String(d.blueprintId)}`));

  await prisma.decomposition.deleteMany({});

  for (const d of data.decompositions) {
    const sourceId = itemIdByTypeId.get(d.primaryTypeId);
    if (!sourceId) { console.warn(`  ⚠ Item typeId ${d.primaryTypeId} not found for decomposition`); continue; }
    const refineryName = refineryNameByTypeId.get(d.facilityTypeId) ?? String(d.facilityTypeId);
    const key = `${sourceId}||${refineryName}||${String(d.blueprintId ?? null)}`;
    const decomp = await prisma.decomposition.create({
      data: {
        sourceItemId: sourceId,
        primaryTypeId: d.primaryTypeId,
        refinery: refineryName,
        runTime: d.runTime,
        blueprintId: d.blueprintId ?? null,
        isDefault: defaultKeys.has(key),
        maxInputRuns: d.maxInputRuns ?? null,
        maxOutputRuns: d.maxOutputRuns ?? null,
        inputs: {
          create: d.inputs.flatMap((inp) => {
            const inpItemId = itemIdByTypeId.get(inp.typeId);
            if (!inpItemId) { console.warn(`  ⚠ Input typeId ${inp.typeId} not found in decomposition of typeId ${d.primaryTypeId}`); return []; }
            return [{ itemId: inpItemId, quantity: inp.quantity }];
          }),
        },
        outputs: {
          create: d.outputs.flatMap((out) => {
            const outItemId = itemIdByTypeId.get(out.typeId);
            if (!outItemId) { console.warn(`  ⚠ Output typeId ${out.typeId} not found in decomposition of typeId ${d.primaryTypeId}`); return []; }
            return [{ itemId: outItemId, quantity: out.quantity }];
          }),
        },
      },
    });
    void decomp;
  }
  console.log(`  ✓ ${data.decompositions.length} decompositions`);

  // Blueprints
  for (const bp of data.blueprints) {
    const outputItemId = itemIdByTypeId.get(bp.primaryTypeId);
    if (!outputItemId) { console.warn(`  ⚠ Item typeId ${bp.primaryTypeId} not found for blueprint`); continue; }
    const primaryOutput = bp.outputs.find((o) => o.typeId === bp.primaryTypeId);
    const outputQty = primaryOutput?.quantity ?? 1;
    const factoryName = factoryNameByTypeId.get(bp.facilityTypeId) ?? String(bp.facilityTypeId);
    const upserted = await prisma.blueprint.upsert({
      where: { outputItemId_factory: { outputItemId, factory: factoryName } },
      update: { outputQty, runTime: bp.runTime, blueprintId: bp.blueprintId ?? null, maxInputRuns: bp.maxInputRuns ?? null, maxOutputRuns: bp.maxOutputRuns ?? null },
      create: { outputItemId, factory: factoryName, outputQty, runTime: bp.runTime, isDefault: false, blueprintId: bp.blueprintId ?? null, maxInputRuns: bp.maxInputRuns ?? null, maxOutputRuns: bp.maxOutputRuns ?? null },
    });
    await prisma.blueprintInput.deleteMany({ where: { blueprintId: upserted.id } });
    for (const inp of bp.inputs) {
      const inpItemId = itemIdByTypeId.get(inp.typeId);
      if (inpItemId) {
        await prisma.blueprintInput.create({
          data: { blueprintId: upserted.id, itemId: inpItemId, quantity: inp.quantity },
        });
      } else {
        console.warn(`  ⚠ Input typeId ${inp.typeId} not found in blueprint for typeId ${bp.primaryTypeId}`);
      }
    }
  }
  const seedBlueprintIds = data.blueprints.map((bp) => bp.blueprintId).filter((id): id is number => id !== null && id !== undefined);
  const deleted = await prisma.blueprint.deleteMany({
    where: { OR: [{ blueprintId: { notIn: seedBlueprintIds } }, { blueprintId: null }] },
  });
  console.log(`  ✓ ${data.blueprints.length} blueprints (${deleted.count} huérfanos eliminados)`);

  // Initial SUPERADMIN — only created on first deploy when DB has no users.
  // Subsequent seed runs skip this. Set INITIAL_SUPERADMIN_PASSWORD in env.
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    const username = process.env.INITIAL_SUPERADMIN_USERNAME || "admin";
    const password = process.env.INITIAL_SUPERADMIN_PASSWORD;
    if (!password) {
      console.warn("  ⚠ INITIAL_SUPERADMIN_PASSWORD not set — no SUPERADMIN created");
      console.warn("    Register via wallet or set the env var and re-run seed.");
    } else {
      const hashed = await bcrypt.hash(password, 12);
      await prisma.user.create({ data: { username, password: hashed, role: "SUPERADMIN" } });
      console.log(`  ✓ Initial SUPERADMIN created: ${username}`);
    }
  }

  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
