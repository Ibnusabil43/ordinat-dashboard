-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('SCHEDULED', 'ONGOING', 'REKAP', 'DONE');

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubtestType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SubtestType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PsikotesEvent" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PsikotesEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubtestLink" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "subtestTypeId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubtestLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecapJob" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "RecapJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "School_slug_key" ON "School"("slug");

-- CreateIndex
CREATE INDEX "School_name_idx" ON "School"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SubtestType_code_key" ON "SubtestType"("code");

-- CreateIndex
CREATE INDEX "PsikotesEvent_schoolId_idx" ON "PsikotesEvent"("schoolId");

-- CreateIndex
CREATE INDEX "PsikotesEvent_status_idx" ON "PsikotesEvent"("status");

-- CreateIndex
CREATE INDEX "PsikotesEvent_scheduledDate_idx" ON "PsikotesEvent"("scheduledDate");

-- CreateIndex
CREATE UNIQUE INDEX "SubtestLink_eventId_subtestTypeId_key" ON "SubtestLink"("eventId", "subtestTypeId");

-- CreateIndex
CREATE INDEX "RecapJob_eventId_idx" ON "RecapJob"("eventId");

-- AddForeignKey
ALTER TABLE "PsikotesEvent" ADD CONSTRAINT "PsikotesEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubtestLink" ADD CONSTRAINT "SubtestLink_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "PsikotesEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubtestLink" ADD CONSTRAINT "SubtestLink_subtestTypeId_fkey" FOREIGN KEY ("subtestTypeId") REFERENCES "SubtestType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecapJob" ADD CONSTRAINT "RecapJob_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "PsikotesEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
