import { Router } from "express";
import { createPaymentSchema, updatePaymentSchema } from "@workshop/shared";
import { prisma } from "../lib/prisma";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../lib/asyncHandler";
import { toNumber } from "../lib/utils";

const router = Router();

function serializePayment(p: {
  id: string;
  periodId: string;
  invoiceNumber: string | null;
  amount: import("@prisma/client").Prisma.Decimal;
  paymentDate: Date;
  employeeId: string | null;
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
    rankReceived: p.rankReceived,
    notes: p.notes,
    createdAt: p.createdAt.toISOString(),
    employee: p.employee ? { id: p.employee.id, name: p.employee.name } : null,
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

    const payment = await prisma.payment.create({
      data: {
        periodId: data.periodId,
        invoiceNumber: data.invoiceNumber,
        amount: data.amount,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        employeeId: data.employeeId,
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
    const payment = await prisma.payment.update({
      where: { id: String(req.params.id) },
      data: {
        invoiceNumber: data.invoiceNumber,
        amount: data.amount,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : undefined,
        employeeId: data.employeeId,
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
