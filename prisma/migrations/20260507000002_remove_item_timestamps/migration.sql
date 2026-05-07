-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "typeId" INTEGER,
    "isRawMaterial" BOOLEAN NOT NULL DEFAULT false,
    "isFound" BOOLEAN NOT NULL DEFAULT false,
    "isFinalProduct" BOOLEAN NOT NULL DEFAULT false,
    "isAsteroid" BOOLEAN NOT NULL DEFAULT false,
    "volume" REAL NOT NULL DEFAULT 0
);
INSERT INTO "new_Item" ("id", "isAsteroid", "isFinalProduct", "isFound", "isRawMaterial", "name", "typeId", "volume") SELECT "id", "isAsteroid", "isFinalProduct", "isFound", "isRawMaterial", "name", "typeId", "volume" FROM "Item";
DROP TABLE "Item";
ALTER TABLE "new_Item" RENAME TO "Item";
CREATE UNIQUE INDEX "Item_typeId_key" ON "Item"("typeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
