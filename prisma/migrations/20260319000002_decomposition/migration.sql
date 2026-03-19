-- CreateTable
CREATE TABLE "Decomposition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceItemId" TEXT NOT NULL,
    "inputQty" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Decomposition_sourceItemId_fkey" FOREIGN KEY ("sourceItemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DecompositionOutput" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "decompositionId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    CONSTRAINT "DecompositionOutput_decompositionId_fkey" FOREIGN KEY ("decompositionId") REFERENCES "Decomposition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DecompositionOutput_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Decomposition_sourceItemId_key" ON "Decomposition"("sourceItemId");

-- CreateIndex
CREATE UNIQUE INDEX "DecompositionOutput_decompositionId_itemId_key" ON "DecompositionOutput"("decompositionId", "itemId");

