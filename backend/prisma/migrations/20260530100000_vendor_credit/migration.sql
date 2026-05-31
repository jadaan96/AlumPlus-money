-- AlterTable
ALTER TABLE "expenses" ADD COLUMN "on_credit" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "expenses" ADD COLUMN "vendor_name" TEXT;
ALTER TABLE "expenses" ADD COLUMN "invoice_number" TEXT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "expense_id" TEXT;

-- CreateIndex
CREATE INDEX "payments_expense_id_idx" ON "payments"("expense_id");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
