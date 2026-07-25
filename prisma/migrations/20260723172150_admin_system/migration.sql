-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProjectStatus" ADD VALUE 'ARCHIVED';
ALTER TYPE "ProjectStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "Asset" ALTER COLUMN "provider" SET DEFAULT 'uploadthing';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "adminNotes" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "statusReason" TEXT,
ADD COLUMN     "suspendedAt" TIMESTAMP(3);
