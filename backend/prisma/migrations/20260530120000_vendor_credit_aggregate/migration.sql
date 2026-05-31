-- AlterTable
ALTER TABLE "payments" ADD COLUMN "is_vendor_credit" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "payments" ADD COLUMN "vendor_name" TEXT;
