-- CreateEnum
CREATE TYPE "WorkshopStatus" AS ENUM ('COLLECTING', 'COMPLETED', 'OVERDUE', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periods" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workshops" (
    "id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "location" TEXT,
    "received_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "remaining_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "delivery_date" DATE,
    "received_date" DATE,
    "status" "WorkshopStatus" NOT NULL DEFAULT 'COLLECTING',
    "section_type" TEXT,
    "source" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "link" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workshops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "description" TEXT,
    "expense_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_entries" (
    "id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "week1" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "week2" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "week3" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "week4" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL DEFAULT 0,

    CONSTRAINT "salary_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "invoice_number" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "payment_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employee_id" TEXT,
    "rank_received" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "periods_year_month_key" ON "periods"("year", "month");

-- CreateIndex
CREATE INDEX "workshops_period_id_idx" ON "workshops"("period_id");

-- CreateIndex
CREATE INDEX "workshops_name_idx" ON "workshops"("name");

-- CreateIndex
CREATE INDEX "workshops_status_idx" ON "workshops"("status");

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_key_key" ON "expense_categories"("key");

-- CreateIndex
CREATE INDEX "expenses_period_id_idx" ON "expenses"("period_id");

-- CreateIndex
CREATE UNIQUE INDEX "salary_entries_period_id_employee_id_key" ON "salary_entries"("period_id", "employee_id");

-- CreateIndex
CREATE INDEX "payments_period_id_idx" ON "payments"("period_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshops" ADD CONSTRAINT "workshops_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_entries" ADD CONSTRAINT "salary_entries_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_entries" ADD CONSTRAINT "salary_entries_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
