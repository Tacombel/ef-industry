-- CreateTable
CREATE TABLE "AsteroidType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ItemAsteroidType" (
    "itemId" TEXT NOT NULL,
    "asteroidTypeId" TEXT NOT NULL,

    PRIMARY KEY ("itemId", "asteroidTypeId"),
    CONSTRAINT "ItemAsteroidType_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItemAsteroidType_asteroidTypeId_fkey" FOREIGN KEY ("asteroidTypeId") REFERENCES "AsteroidType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AsteroidTypeLocation" (
    "asteroidTypeId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,

    PRIMARY KEY ("asteroidTypeId", "locationId"),
    CONSTRAINT "AsteroidTypeLocation_asteroidTypeId_fkey" FOREIGN KEY ("asteroidTypeId") REFERENCES "AsteroidType" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AsteroidTypeLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AsteroidType_name_key" ON "AsteroidType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");
