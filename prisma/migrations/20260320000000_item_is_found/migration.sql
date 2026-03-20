-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isRawMaterial" BOOLEAN NOT NULL DEFAULT false,
    "isFound" BOOLEAN NOT NULL DEFAULT false,
    "isFinalProduct" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Item" ("createdAt", "id", "isFinalProduct", "isRawMaterial", "name", "updatedAt") SELECT "createdAt", "id", "isFinalProduct", "isRawMaterial", "name", "updatedAt" FROM "Item";
DROP TABLE "Item";
ALTER TABLE "new_Item" RENAME TO "Item";
CREATE UNIQUE INDEX "Item_name_key" ON "Item"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
