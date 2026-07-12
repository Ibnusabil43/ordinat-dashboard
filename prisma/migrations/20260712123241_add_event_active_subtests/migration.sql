-- AlterTable
ALTER TABLE "PsikotesEvent" ADD COLUMN     "activeSubtests" TEXT[] DEFAULT ARRAY[]::TEXT[];
