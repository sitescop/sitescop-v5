-- CreateEnum
CREATE TYPE "JobContractSource" AS ENUM ('DIGITAL', 'MANUAL_PAPER');

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN "contractSource" "JobContractSource" NOT NULL DEFAULT 'DIGITAL';
