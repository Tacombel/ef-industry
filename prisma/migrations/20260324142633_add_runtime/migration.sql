-- AddColumn to Blueprint
ALTER TABLE "Blueprint" ADD COLUMN "runTime" INTEGER NOT NULL DEFAULT 0;

-- AddColumn to Decomposition
ALTER TABLE "Decomposition" ADD COLUMN "runTime" INTEGER NOT NULL DEFAULT 0;
