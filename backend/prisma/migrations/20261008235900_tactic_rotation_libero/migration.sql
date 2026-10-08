-- AlterTable
ALTER TABLE "Tactic" ADD COLUMN     "rotation" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "opponentRotation" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "liberoReplaces" "Slot";
