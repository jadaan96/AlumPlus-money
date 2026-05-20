import { Router } from "express";
import { prisma } from "../lib/prisma";
import { getPeriodSummary } from "../lib/periodSummary";
import { asyncHandler } from "../lib/asyncHandler";
import { periodLabel, toNumber } from "../lib/utils";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const periodId = req.query.periodId as string | undefined;
    if (!periodId) {
      return res.status(400).json({ error: "periodId مطلوب" });
    }
    const period = await prisma.period.findUnique({ where: { id: periodId } });
    if (!period) return res.status(404).json({ error: "الفترة غير موجودة" });

    const summary = await getPeriodSummary(periodId);
    const topRemaining = await prisma.workshop.findMany({
      where: { periodId, remainingAmount: { gt: 0 } },
      orderBy: { remainingAmount: "desc" },
      take: 10,
    });
    res.json({
      summary,
      topRemaining: topRemaining.map((w) => ({
        id: w.id,
        name: w.name,
        remainingAmount: toNumber(w.remainingAmount),
        phone: w.phone,
        status: w.status,
      })),
    });
  })
);

router.get(
  "/compare",
  asyncHandler(async (req, res) => {
    const a = req.query.periodA as string;
    const b = req.query.periodB as string;
    if (!a || !b) {
      return res.status(400).json({ error: "periodA و periodB مطلوبان" });
    }
    const [periodA, periodB] = await Promise.all([
      prisma.period.findUnique({ where: { id: a } }),
      prisma.period.findUnique({ where: { id: b } }),
    ]);
    if (!periodA || !periodB) {
      return res.status(404).json({ error: "إحدى الفترات غير موجودة" });
    }
    const [summaryA, summaryB] = await Promise.all([
      getPeriodSummary(a),
      getPeriodSummary(b),
    ]);
    res.json({
      periodA: {
        id: periodA.id,
        year: periodA.year,
        month: periodA.month,
        label: periodLabel(periodA.year, periodA.month),
        summary: summaryA,
      },
      periodB: {
        id: periodB.id,
        year: periodB.year,
        month: periodB.month,
        label: periodLabel(periodB.year, periodB.month),
        summary: summaryB,
      },
    });
  })
);

router.get(
  "/chart",
  asyncHandler(async (req, res) => {
    const limit = parseInt((req.query.limit as string) || "6", 10);
    const periods = await prisma.period.findMany({
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: limit,
    });
    const reversed = [...periods].reverse();
    const data = await Promise.all(
      reversed.map(async (p) => {
        const s = await getPeriodSummary(p.id);
        return {
          label: periodLabel(p.year, p.month),
          periodId: p.id,
          income: s.workshopsReceived,
          expenses: s.expensesTotal,
          salaries: s.salariesTotal,
          payments: s.paymentsTotal,
          workshopsTotal: s.workshopsTotal,
          remaining: s.workshopsRemaining,
        };
      })
    );
    res.json(data);
  })
);

export default router;
