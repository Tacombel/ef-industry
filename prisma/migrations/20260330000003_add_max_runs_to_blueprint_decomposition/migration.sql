-- AlterTable
ALTER TABLE "Blueprint" ADD COLUMN "maxInputRuns" INTEGER;
ALTER TABLE "Blueprint" ADD COLUMN "maxOutputRuns" INTEGER;

-- AlterTable
ALTER TABLE "Decomposition" ADD COLUMN "maxInputRuns" INTEGER;
ALTER TABLE "Decomposition" ADD COLUMN "maxOutputRuns" INTEGER;
