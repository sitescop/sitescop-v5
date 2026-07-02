-- Phase 1: Jobs, CRM, Settings, Admin

CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'PENDING_ASSIGNMENT', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ARCHIVED');
CREATE TYPE "JobType" AS ENUM ('BUILDING', 'PEST', 'COMBINED', 'PRE_PURCHASE', 'PRE_SALE', 'OTHER');
CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');
CREATE TYPE "ContactType" AS ENUM ('CLIENT', 'AGENT', 'BUILDER', 'PROPERTY_MANAGER');
CREATE TYPE "ContactStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "ContactType" NOT NULL,
    "status" "ContactStatus" NOT NULL DEFAULT 'ACTIVE',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "companyName" TEXT,
    "abn" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "suburb" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "JobType" NOT NULL DEFAULT 'BUILDING',
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "propertyId" TEXT,
    "clientContactId" TEXT,
    "agentContactId" TEXT,
    "scheduledDate" TIMESTAMP(3),
    "scheduledTime" TEXT,
    "priceCents" INTEGER,
    "notes" TEXT,
    "assignedInspectorId" TEXT,
    "createdById" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "job_assignments" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "inspectorId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "declineReason" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "company_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL DEFAULT '#0B6E4F',
    "secondaryColor" TEXT NOT NULL DEFAULT '#1E3A5F',
    "reportHeader" TEXT,
    "reportFooter" TEXT,
    "emailFromName" TEXT,
    "emailFromAddress" TEXT,
    "emailSignature" TEXT,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smsSenderId" TEXT,
    "pdfFooterText" TEXT,
    "pdfIncludeLogo" BOOLEAN NOT NULL DEFAULT true,
    "notifyNewJob" BOOLEAN NOT NULL DEFAULT true,
    "notifyJobAssigned" BOOLEAN NOT NULL DEFAULT true,
    "notifyJobCompleted" BOOLEAN NOT NULL DEFAULT true,
    "defaultBuildingPrice" INTEGER,
    "defaultPestPrice" INTEGER,
    "defaultCombinedPrice" INTEGER,
    "gstRate" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "emailTemplates" JSONB NOT NULL DEFAULT '{}',
    "smsTemplates" JSONB NOT NULL DEFAULT '{}',
    "integrations" JSONB NOT NULL DEFAULT '{}',
    "backupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "backupFrequency" TEXT NOT NULL DEFAULT 'weekly',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "jobs_companyId_jobNumber_key" ON "jobs"("companyId", "jobNumber");
CREATE INDEX "contacts_companyId_idx" ON "contacts"("companyId");
CREATE INDEX "contacts_type_idx" ON "contacts"("type");
CREATE INDEX "contacts_deletedAt_idx" ON "contacts"("deletedAt");
CREATE INDEX "properties_companyId_idx" ON "properties"("companyId");
CREATE INDEX "jobs_companyId_idx" ON "jobs"("companyId");
CREATE INDEX "jobs_status_idx" ON "jobs"("status");
CREATE INDEX "jobs_assignedInspectorId_idx" ON "jobs"("assignedInspectorId");
CREATE INDEX "jobs_deletedAt_idx" ON "jobs"("deletedAt");
CREATE INDEX "jobs_archivedAt_idx" ON "jobs"("archivedAt");
CREATE INDEX "job_assignments_jobId_idx" ON "job_assignments"("jobId");
CREATE INDEX "job_assignments_inspectorId_idx" ON "job_assignments"("inspectorId");
CREATE UNIQUE INDEX "company_settings_companyId_key" ON "company_settings"("companyId");
CREATE INDEX "api_keys_companyId_idx" ON "api_keys"("companyId");

ALTER TABLE "contacts" ADD CONSTRAINT "contacts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "properties" ADD CONSTRAINT "properties_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_clientContactId_fkey" FOREIGN KEY ("clientContactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_agentContactId_fkey" FOREIGN KEY ("agentContactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_assignedInspectorId_fkey" FOREIGN KEY ("assignedInspectorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "job_assignments" ADD CONSTRAINT "job_assignments_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_assignments" ADD CONSTRAINT "job_assignments_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "job_assignments" ADD CONSTRAINT "job_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
