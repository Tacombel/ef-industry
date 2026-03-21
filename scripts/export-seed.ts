/**
 * Exports current database game data to prisma/seed.json.
 * Run with: npm run db:export
 *
 * Exports: factories, locations, items, asteroid types, decompositions, blueprints.
 * Does NOT export: stock, packs (personal/operational data).
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  const [factories, locations, items, asteroidTypes, decompositions, blueprints] =
    await Promise.all([
      prisma.factory.findMany({ orderBy: { name: "asc" } }),
      prisma.location.findMany({ orderBy: { name: "asc" } }),
      prisma.item.findMany({ orderBy: { name: "asc" } }),
      prisma.asteroidType.findMany({
        include: {
          locations: { include: { location: true } },
          items: { include: { item: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.decomposition.findMany({
        include: {
          sourceItem: true,
          outputs: { include: { item: true }, orderBy: { quantity: "desc" } },
        },
        orderBy: { sourceItem: { name: "asc" } },
      }),
      prisma.blueprint.findMany({
        include: {
          outputItem: true,
          inputs: { include: { item: true }, orderBy: { quantity: "desc" } },
        },
        orderBy: [{ outputItem: { name: "asc" } }, { isDefault: "desc" }],
      }),
    ]);

  const seed = {
    factories: factories.map((f) => f.name),
    locations: locations.map((l) => l.name),
    items: items.map((i) => ({
      name: i.name,
      isRawMaterial: i.isRawMaterial,
      isFound: i.isFound,
      isFinalProduct: i.isFinalProduct,
    })),
    asteroidTypes: asteroidTypes.map((at) => ({
      name: at.name,
      locations: at.locations.map((l) => l.location.name).sort(),
      items: at.items.map((i) => i.item.name).sort(),
    })),
    decompositions: decompositions.map((d) => ({
      sourceItem: d.sourceItem.name,
      inputQty: d.inputQty,
      outputs: d.outputs.map((o) => ({ item: o.item.name, quantity: o.quantity })),
    })),
    blueprints: blueprints.map((bp) => ({
      outputItem: bp.outputItem.name,
      factory: bp.factory,
      outputQty: bp.outputQty,
      isDefault: bp.isDefault,
      inputs: bp.inputs.map((i) => ({ item: i.item.name, quantity: i.quantity })),
    })),
  };

  const outPath = path.join(process.cwd(), "prisma/seed.json");
  fs.writeFileSync(outPath, JSON.stringify(seed, null, 2) + "\n");

  console.log(`Exported to prisma/seed.json`);
  console.log(`  ${seed.factories.length} factories`);
  console.log(`  ${seed.locations.length} locations`);
  console.log(`  ${seed.items.length} items`);
  console.log(`  ${seed.asteroidTypes.length} asteroid types`);
  console.log(`  ${seed.decompositions.length} decompositions`);
  console.log(`  ${seed.blueprints.length} blueprints`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
