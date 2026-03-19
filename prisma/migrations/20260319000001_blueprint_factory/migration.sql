-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Blueprint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "outputItemId" TEXT NOT NULL,
    "factory" TEXT NOT NULL DEFAULT '',
    "outputQty" INTEGER NOT NULL DEFAULT 1,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Blueprint_outputItemId_fkey" FOREIGN KEY ("outputItemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Blueprint" ("createdAt", "id", "outputItemId", "outputQty", "updatedAt") SELECT "createdAt", "id", "outputItemId", "outputQty", "updatedAt" FROM "Blueprint";
DROP TABLE "Blueprint";
ALTER TABLE "new_Blueprint" RENAME TO "Blueprint";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

