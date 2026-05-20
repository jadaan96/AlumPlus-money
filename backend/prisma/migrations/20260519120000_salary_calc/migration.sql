-- AlterTable
ALTER TABLE "employees" ADD COLUMN "weekly_salary" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "salary_entries" ADD COLUMN "week_details" JSONB NOT NULL DEFAULT '[]';
