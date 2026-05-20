import { Router } from "express";
import { Prisma } from "@prisma/client";
import {
  EXPENSE_CATEGORY_KEYS,
  createExpenseCategorySchema,
  createExpenseSchema,
  expensePeriodQuerySchema,
  updateExpenseSchema,
} from "@workshop/shared";
import { prisma } from "../lib/prisma";
import { validateBody, validateQuery } from "../middleware/validate";
import { asyncHandler } from "../lib/asyncHandler";
import { resolveExpenseCategory } from "../lib/resolveCategory";
import { toNumber } from "../lib/utils";

const router = Router();

function makeCategoryKey(label: string): string {
  const slug =
    label
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9\u0600-\u06FF-]/g, "")
      .slice(0, 40) || "faea";
  return `custom-${slug}-${Date.now().toString(36).slice(-4)}`;
}

function isBuiltinCategory(key: string): boolean {
  return (EXPENSE_CATEGORY_KEYS as readonly string[]).includes(key);
}

function serializeExpense(e: {
  id: string;
  periodId: string;
  categoryId: string;
  amount: Prisma.Decimal;
  description: string | null;
  expenseDate: Date;
  createdAt: Date;
  category: { id: string; key: string; label: string };
}) {
  return {
    id: e.id,
    periodId: e.periodId,
    categoryId: e.categoryId,
    amount: toNumber(e.amount),
    description: e.description,
    expenseDate: e.expenseDate.toISOString().slice(0, 10),
    createdAt: e.createdAt.toISOString(),
    category: e.category,
  };
}

router.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    const categories = await prisma.expenseCategory.findMany({
      orderBy: { label: "asc" },
      include: { _count: { select: { expenses: true } } },
    });
    res.json(
      categories.map((c) => ({
        id: c.id,
        key: c.key,
        label: c.label,
        isBuiltin: isBuiltinCategory(c.key),
        expensesCount: c._count.expenses,
      }))
    );
  })
);

router.post(
  "/categories",
  validateBody(createExpenseCategorySchema),
  asyncHandler(async (req, res) => {
    const label = req.body.label.trim();
    const existing = await prisma.expenseCategory.findFirst({
      where: { label: { equals: label, mode: "insensitive" } },
    });
    if (existing) {
      return res.status(200).json({
        id: existing.id,
        key: existing.key,
        label: existing.label,
        isBuiltin: isBuiltinCategory(existing.key),
        expensesCount: await prisma.expense.count({
          where: { categoryId: existing.id },
        }),
      });
    }
    const category = await prisma.expenseCategory.create({
      data: { key: makeCategoryKey(label), label },
    });
    res.status(201).json({
      id: category.id,
      key: category.key,
      label: category.label,
      isBuiltin: false,
      expensesCount: 0,
    });
  })
);

router.delete(
  "/categories/:id",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const category = await prisma.expenseCategory.findUnique({ where: { id } });
    if (!category) return res.status(404).json({ error: "الفئة غير موجودة" });
    if (isBuiltinCategory(category.key)) {
      return res.status(400).json({ error: "لا يمكن حذف الفئات الافتراضية" });
    }
    const count = await prisma.expense.count({ where: { categoryId: id } });
    if (count > 0) {
      return res.status(400).json({ error: "لا يمكن حذف فئة مرتبطة بمصروفات" });
    }
    await prisma.expenseCategory.delete({ where: { id } });
    res.json({ ok: true });
  })
);

router.get(
  "/period/:periodId/summary",
  asyncHandler(async (req, res) => {
    const periodId = String(req.params.periodId);
    const period = await prisma.period.findUnique({ where: { id: periodId } });
    if (!period) return res.status(404).json({ error: "الفترة غير موجودة" });

    const expenses = await prisma.expense.findMany({
      where: { periodId },
      include: { category: true },
    });
    const byCategory = new Map<
      string,
      { categoryId: string; key: string; label: string; total: number; count: number }
    >();
    for (const e of expenses) {
      const cur = byCategory.get(e.categoryId) ?? {
        categoryId: e.category.id,
        key: e.category.key,
        label: e.category.label,
        total: 0,
        count: 0,
      };
      cur.total += toNumber(e.amount);
      cur.count += 1;
      byCategory.set(e.categoryId, cur);
    }
    const items = [...byCategory.values()].sort((a, b) => b.total - a.total);
    const grandTotal = round2(items.reduce((s, i) => s + i.total, 0));
    res.json({ items, grandTotal, periodId });
  })
);

router.get(
  "/period/:periodId",
  validateQuery(expensePeriodQuerySchema),
  asyncHandler(async (req, res) => {
    const periodId = String(req.params.periodId);
    const { categoryId } = req.query as { categoryId?: string };

    const period = await prisma.period.findUnique({ where: { id: periodId } });
    if (!period) return res.status(404).json({ error: "الفترة غير موجودة" });

    const expenses = await prisma.expense.findMany({
      where: { periodId, ...(categoryId ? { categoryId } : {}) },
      include: { category: true },
      orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
    });
    const items = expenses.map(serializeExpense);
    const total = round2(items.reduce((s, e) => s + e.amount, 0));
    res.json({ items, total, periodId, categoryId: categoryId ?? null });
  })
);

router.post(
  "/",
  validateBody(createExpenseSchema),
  asyncHandler(async (req, res) => {
    const { periodId, categoryKey, categoryId, amount, description, expenseDate } =
      req.body;

    const period = await prisma.period.findUnique({ where: { id: periodId } });
    if (!period) return res.status(404).json({ error: "الفترة غير موجودة" });

    const category = await resolveExpenseCategory(categoryKey, categoryId);
    if (!category) return res.status(400).json({ error: "فئة غير موجودة" });

    const expense = await prisma.expense.create({
      data: {
        periodId,
        categoryId: category.id,
        amount,
        description: description ?? null,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      },
      include: { category: true },
    });
    res.status(201).json(serializeExpense(expense));
  })
);

router.put(
  "/:id",
  validateBody(updateExpenseSchema),
  asyncHandler(async (req, res) => {
    const data = req.body;
    let categoryId: string | undefined;
    if (data.categoryKey || data.categoryId) {
      const cat = await resolveExpenseCategory(data.categoryKey, data.categoryId);
      if (!cat) return res.status(400).json({ error: "فئة غير موجودة" });
      categoryId = cat.id;
    }
    const expense = await prisma.expense.update({
      where: { id: String(req.params.id) },
      data: {
        amount: data.amount,
        description: data.description,
        categoryId,
        expenseDate: data.expenseDate ? new Date(data.expenseDate) : undefined,
      },
      include: { category: true },
    });
    res.json(serializeExpense(expense));
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.expense.delete({ where: { id: String(req.params.id) } });
    res.json({ ok: true });
  })
);

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export default router;
