import { Router } from "express";
import { createPaymentSchema, updatePaymentSchema } from "@workshop/shared";
import { prisma } from "../lib/prisma";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../lib/asyncHandler";
import { toNumber } from "../lib/utils";
import {
  totalCreditPurchases,
  totalVendorCreditPaid,
  vendorPayablesRemaining,
} from "../lib/vendorCredit";

const router = Router();

function serializePayment(p: {
  id: string;
  periodId: string;
  invoiceNumber: string | null;
  amount: import("@prisma/client").Prisma.Decimal;
  paymentDate: Date;
  employeeId: string | null;
  expenseId: string | null;
  isVendorCredit: boolean;
  vendorName: string | null;
  rankReceived: string | null;
  notes: string | null;
  createdAt: Date;
  employee?: { id: string; name: string } | null;
}) {
  return {
    id: p.id,
    periodId: p.periodId,
    invoiceNumber: p.invoiceNumber,
    amount: toNumber(p.amount),
    paymentDate: p.paymentDate.toISOString().slice(0, 10),
    employeeId: p.employeeId,
    expenseId: p.expenseId,
    isVendorCredit: p.isVendorCredit,
    vendorName: p.vendorName,
    rankReceived: p.rankReceived,
    notes: p.notes,
    createdAt: p.createdAt.toISOString(),
    employee: p.employee ? { id: p.employee.id, name: p.employee.name } : null,
  };
}

async function getVendorCreditRemaining(periodId: string, excludePaymentId?: string) {
  const [expenses, payments] = await Promise.all([
    prisma.expense.findMany({ where: { periodId } }),
    prisma.payment.findMany({ where: { periodId } }),
  ]);
  const filtered = excludePaymentId
    ? payments.filter((p) => p.id !== excludePaymentId)
    : payments;
  return {
    totalCredit: totalCreditPurchases(expenses),
    remaining: vendorPayablesRemaining(expenses, filtered),
  };
}

router.get(
  "/period/:periodId",
  asyncHandler(async (req, res) => {
    const periodId = String(req.params.periodId);
    const period = await prisma.period.findUnique({ where: { id: periodId } });
    if (!period) return res.status(404).json({ error: "الفترة غير موجودة" });

    const payments = await prisma.payment.findMany({
      where: { periodId },
      include: { employee: { select: { id: true, name: true } } },
      orderBy: { paymentDate: "desc" },
    });
    const items = payments.map(serializePayment);
    const total = items.reduce((s, p) => s + p.amount, 0);
    res.json({ items, total, periodId });
  })
);

router.post(
  "/",
  validateBody(createPaymentSchema),
  asyncHandler(async (req, res) => {
    const data = req.body;
    const period = await prisma.period.findUnique({ where: { id: data.periodId } });
    if (!period) return res.status(404).json({ error: "الفترة غير موجودة" });

    if (data.isVendorCredit) {
      const { remaining } = await getVendorCreditRemaining(data.periodId);
      if (data.amount > remaining + 0.001) {
        return res.status(400).json({
          error: `المبلغ يتجاوز ذمم التجار المتبقية (${remaining.toFixed(2)})`,
        });
      }
    }

    if (data.expenseId) {
      const expense = await prisma.expense.findUnique({ where: { id: data.expenseId } });
      if (!expense?.onCredit || expense.periodId !== data.periodId) {
        return res.status(400).json({ error: "فاتورة الذم غير صالحة" });
      }
    }

    const payment = await prisma.payment.create({
      data: {
        periodId: data.periodId,
        invoiceNumber: data.invoiceNumber,
        amount: data.amount,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        employeeId: data.employeeId,
        expenseId: data.expenseId,
        isVendorCredit: Boolean(data.isVendorCredit),
        vendorName: data.isVendorCredit ? data.vendorName?.trim() || null : null,
        rankReceived: data.rankReceived,
        notes: data.notes,
      },
      include: { employee: { select: { id: true, name: true } } },
    });
    res.status(201).json(serializePayment(payment));
  })
);

router.put(
  "/:id",
  validateBody(updatePaymentSchema),
  asyncHandler(async (req, res) => {
    const data = req.body;
    const existing = await prisma.payment.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) return res.status(404).json({ error: "الدفعة غير موجودة" });

    const isVendorCredit =
      data.isVendorCredit !== undefined ? data.isVendorCredit : existing.isVendorCredit;
    const amount = data.amount !== undefined ? data.amount : toNumber(existing.amount);

    if (isVendorCredit) {
      const { remaining } = await getVendorCreditRemaining(existing.periodId, existing.id);
      if (amount > remaining + 0.001) {
        return res.status(400).json({
          error: `المبلغ يتجاوز ذمم التجار المتبقية (${remaining.toFixed(2)})`,
        });
      }
    }

    const payment = await prisma.payment.update({
      where: { id: String(req.params.id) },
      data: {
        invoiceNumber: data.invoiceNumber,
        amount: data.amount,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : undefined,
        employeeId: data.employeeId,
        expenseId: data.expenseId,
        isVendorCredit: data.isVendorCredit,
        vendorName:
          data.vendorName !== undefined
            ? data.vendorName?.trim() || null
            : undefined,
        rankReceived: data.rankReceived,
        notes: data.notes,
      },
      include: { employee: { select: { id: true, name: true } } },
    });
    res.json(serializePayment(payment));
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.payment.delete({ where: { id: String(req.params.id) } });
    res.json({ ok: true });
  })
);

export default router;
