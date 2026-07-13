-- AlterTable
ALTER TABLE "SubtestLink" ADD COLUMN     "checkMessage" TEXT,
ADD COLUMN     "checkStatus" TEXT,
ADD COLUMN     "checkedAt" TIMESTAMP(3);
