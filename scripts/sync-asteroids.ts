/**
 * Syncs asteroidTypes from seed.json → data/game-data.json
 * Usage: npx tsx scripts/sync-asteroids.ts
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

interface GameData {
  factories: string[];
  refineries: string[];
  locations: string[];
  items: any[];
  asteroidTypes: any[];
  decompositions: any[];
  blueprints: any[];
}

const seedPath = join(process.cwd(), "prisma/seed.json");
const dataPath = join(process.cwd(), "data/game-data.json");

const seedData = JSON.parse(readFileSync(seedPath, "utf-8"));
const gameData: GameData = JSON.parse(readFileSync(dataPath, "utf-8"));

console.log("Syncing asteroidTypes from seed.json → game-data.json...");

gameData.asteroidTypes = seedData.asteroidTypes;

writeFileSync(dataPath, JSON.stringify(gameData, null, 2) + "\n");

console.log(`  ✓ Updated ${gameData.asteroidTypes.length} asteroid types with their ore items`);
console.log(`Written to ${dataPath}`);
