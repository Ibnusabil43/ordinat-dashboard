-- AlterTable
ALTER TABLE "PsikotesEvent" DROP COLUMN "activeSubtests";

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "activeSubtests" TEXT[] DEFAULT ARRAY[]::TEXT[];

