-- Phase 3: Inspections, Room Engine

CREATE TYPE "InspectionStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED');
CREATE TYPE "InspectionRoomType" AS ENUM ('BEDROOM', 'BATHROOM', 'LIVING', 'GARAGE');

CREATE TABLE "inspections" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "inspectionNumber" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" "InspectionStatus" NOT NULL DEFAULT 'DRAFT',
    "inspectorId" TEXT,
    "formData" JSONB NOT NULL DEFAULT '{}',
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inspection_rooms" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "roomType" "InspectionRoomType" NOT NULL,
    "roomIndex" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspection_rooms_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "inspections_companyId_inspectionNumber_key" ON "inspections"("companyId", "inspectionNumber");
CREATE INDEX "inspections_companyId_idx" ON "inspections"("companyId");
CREATE INDEX "inspections_jobId_idx" ON "inspections"("jobId");
CREATE INDEX "inspections_status_idx" ON "inspections"("status");
CREATE INDEX "inspections_inspectorId_idx" ON "inspections"("inspectorId");

CREATE UNIQUE INDEX "inspection_rooms_inspectionId_roomType_roomIndex_key" ON "inspection_rooms"("inspectionId", "roomType", "roomIndex");
CREATE INDEX "inspection_rooms_inspectionId_idx" ON "inspection_rooms"("inspectionId");

ALTER TABLE "inspections" ADD CONSTRAINT "inspections_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inspection_rooms" ADD CONSTRAINT "inspection_rooms_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
