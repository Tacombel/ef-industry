-- CreateTable
CREATE TABLE "DecompositionInput" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "decompositionId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    CONSTRAINT "DecompositionInput_decompositionId_fkey" FOREIGN KEY ("decompositionId") REFERENCES "Decomposition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DecompositionInput_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Decomposition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "blueprintId" INTEGER,
    "primaryTypeId" INTEGER NOT NULL DEFAULT 0,
    "sourceItemId" TEXT NOT NULL,
    "refinery" TEXT NOT NULL DEFAULT '',
    "runTime" INTEGER NOT NULL DEFAULT 0,
    "maxInputRuns" INTEGER,
    "maxOutputRuns" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Decomposition_sourceItemId_fkey" FOREIGN KEY ("sourceItemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Decomposition" ("blueprintId", "createdAt", "id", "isDefault", "maxInputRuns", "maxOutputRuns", "refinery", "runTime", "sourceItemId", "updatedAt") SELECT "blueprintId", "createdAt", "id", "isDefault", "maxInputRuns", "maxOutputRuns", "refinery", "runTime", "sourceItemId", "updatedAt" FROM "Decomposition";
DROP TABLE "Decomposition";
ALTER TABLE "new_Decomposition" RENAME TO "Decomposition";
CREATE UNIQUE INDEX "Decomposition_sourceItemId_refinery_blueprintId_key" ON "Decomposition"("sourceItemId", "refinery", "blueprintId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "DecompositionInput_decompositionId_itemId_key" ON "DecompositionInput"("decompositionId", "itemId");
