-- AlterTable
ALTER TABLE "Tactic" ADD COLUMN     "basePositions" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "TacticStep" ADD COLUMN     "delay" INTEGER NOT NULL DEFAULT 0;
