-- Phase 2: Agreements

CREATE TYPE "AgreementStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'SIGNED', 'DECLINED', 'EXPIRED', 'CANCELLED');

ALTER TABLE "company_settings" ADD COLUMN "agreementTemplates" JSONB NOT NULL DEFAULT '{}';

CREATE TABLE "agreements" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "agreementNumber" TEXT NOT NULL,
    "jobId" TEXT,
    "status" "AgreementStatus" NOT NULL DEFAULT 'DRAFT',
    "type" "JobType" NOT NULL DEFAULT 'BUILDING',
    "clientContactId" TEXT,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "clientPhone" TEXT,
    "propertyAddress" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "gstCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "agreementDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "legalSections" JSONB NOT NULL DEFAULT '{}',
    "accessTokenHash" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "declineReason" TEXT,
    "signatureName" TEXT,
    "signatureData" TEXT,
    "signedIp" TEXT,
    "declarationsAccepted" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agreements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agreements_companyId_agreementNumber_key" ON "agreements"("companyId", "agreementNumber");
CREATE UNIQUE INDEX "agreements_accessTokenHash_key" ON "agreements"("accessTokenHash");
CREATE INDEX "agreements_companyId_idx" ON "agreements"("companyId");
CREATE INDEX "agreements_status_idx" ON "agreements"("status");
CREATE INDEX "agreements_jobId_idx" ON "agreements"("jobId");
CREATE INDEX "agreements_clientEmail_idx" ON "agreements"("clientEmail");

ALTER TABLE "agreements" ADD CONSTRAINT "agreements_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_clientContactId_fkey" FOREIGN KEY ("clientContactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
