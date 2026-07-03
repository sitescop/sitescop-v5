-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('BUILDING', 'PEST');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('GENERATING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "inspection_reports" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "reportType" "ReportType" NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'GENERATING',
    "fileName" TEXT NOT NULL,
    "filePath" TEXT,
    "fileSizeBytes" INTEGER,
    "errorMessage" TEXT,
    "generatedById" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspection_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inspection_reports_companyId_idx" ON "inspection_reports"("companyId");

-- CreateIndex
CREATE INDEX "inspection_reports_inspectionId_idx" ON "inspection_reports"("inspectionId");

-- CreateIndex
CREATE INDEX "inspection_reports_status_idx" ON "inspection_reports"("status");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_reports_inspectionId_reportType_key" ON "inspection_reports"("inspectionId", "reportType");

-- AddForeignKey
ALTER TABLE "inspection_reports" ADD CONSTRAINT "inspection_reports_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_reports" ADD CONSTRAINT "inspection_reports_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_reports" ADD CONSTRAINT "inspection_reports_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
