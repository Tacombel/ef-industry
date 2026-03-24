import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import data from "./seed.json";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clear game data
  await prisma.blueprintInput.deleteMany();
  await prisma.blueprint.deleteMany();
  await prisma.decompositionOutput.deleteMany();
  await prisma.decomposition.deleteMany();
  await prisma.itemAsteroidType.deleteMany();
  await prisma.asteroidTypeLocation.deleteMany();
  await prisma.asteroidType.deleteMany();
  await prisma.location.deleteMany();
  await prisma.item.deleteMany();
  await prisma.factory.deleteMany();
  await prisma.refinery.deleteMany();

  // Facilities (factories and refineries)
  const factories = data.facilities.filter((f) => f.type === "factory");
  const refineries = data.facilities.filter((f) => f.type === "refinery");
  for (const f of factories) {
    await prisma.factory.create({ data: { name: f.name } });
  }
  for (const r of refineries) {
    await prisma.refinery.create({ data: { name: r.name } });
  }
  console.log(`  ✓ ${factories.length} factories, ${refineries.length} refineries`);

  // Locations
  for (const name of data.locations) {
    await prisma.location.create({ data: { name } });
  }
  console.log(`  ✓ ${data.locations.length} locations`);

  // Items
  for (const item of data.items) {
    await prisma.item.create({ data: item });
  }
  console.log(`  ✓ ${data.items.length} items`);

  // Asteroid types with their locations and linked items
  for (const at of data.asteroidTypes) {
    const created = await prisma.asteroidType.create({ data: { name: at.name } });
    for (const locName of at.locations) {
      const loc = await prisma.location.findUnique({ where: { name: locName } });
      if (loc) {
        await prisma.asteroidTypeLocation.create({
          data: { asteroidTypeId: created.id, locationId: loc.id },
        });
      }
    }
    for (const itemName of at.items) {
      const item = await prisma.item.findUnique({ where: { name: itemName } });
      if (item) {
        await prisma.itemAsteroidType.create({
          data: { itemId: item.id, asteroidTypeId: created.id },
        });
      }
    }
  }
  console.log(`  ✓ ${data.asteroidTypes.length} asteroid types`);

  // Decompositions
  for (const d of data.decompositions) {
    const source = await prisma.item.findUnique({ where: { name: d.sourceItem } });
    if (!source) { console.warn(`  ⚠ Item not found for decomposition: ${d.sourceItem}`); continue; }
    const decomp = await prisma.decomposition.create({
      data: {
        sourceItemId: source.id,
        refinery: d.facility,
        inputQty: d.inputQty,
        runTime: d.runTime,
      },
    });
    for (const out of d.outputs) {
      const outItem = await prisma.item.findUnique({ where: { name: out.item } });
      if (outItem) {
        await prisma.decompositionOutput.create({
          data: { decompositionId: decomp.id, itemId: outItem.id, quantity: out.quantity },
        });
      }
    }
  }
  console.log(`  ✓ ${data.decompositions.length} decompositions`);

  // Blueprints
  for (const bp of data.blueprints) {
    const outputItem = await prisma.item.findUnique({ where: { name: bp.outputItem } });
    if (!outputItem) { console.warn(`  ⚠ Item not found for blueprint: ${bp.outputItem}`); continue; }
    const created = await prisma.blueprint.create({
      data: {
        outputItemId: outputItem.id,
        factory: bp.facility,
        outputQty: bp.outputQty,
        runTime: bp.runTime,
        isDefault: false,
      },
    });
    for (const inp of bp.inputs) {
      const inpItem = await prisma.item.findUnique({ where: { name: inp.item } });
      if (inpItem) {
        await prisma.blueprintInput.create({
          data: { blueprintId: created.id, itemId: inpItem.id, quantity: inp.quantity },
        });
      }
    }
  }
  console.log(`  ✓ ${data.blueprints.length} blueprints`);

  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
