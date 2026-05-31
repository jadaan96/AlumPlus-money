import { Router } from "express";
import { createPeriodSchema, updatePeriodSchema } from "@workshop/shared";
import { prisma } from "../lib/prisma";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../lib/asyncHandler";
import { getPeriodSummary } from "../lib/periodSummary";
import { periodLabel } from "../lib/utils";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const periods = await prisma.period.findMany({
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    const withSummary = await Promise.all(
      periods.map(async (p) => ({
        id: p.id,
        year: p.year,
        month: p.month,
        createdAt: p.createdAt.toISOString(),
        label: periodLabel(p.year, p.month),
        summary: await getPeriodSummary(p.id),
      }))
    );
    res.json(withSummary);
  })
);

router.post(
  "/",
  validateBody(createPeriodSchema),
  asyncHandler(async (req, res) => {
    const { year, month } = req.body;
    const existing = await prisma.period.findUnique({
      where: { year_month: { year, month } },
    });
    if (existing) {
      return res.status(409).json({ error: "هذه الفترة موجودة مسبقاً" });
    }
    const period = await prisma.period.create({ data: { year, month } });
    res.status(201).json({
      id: period.id,
      year: period.year,
      month: period.month,
      createdAt: period.createdAt.toISOString(),
      label: periodLabel(year, month),
    });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const period = await prisma.period.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!period) return res.status(404).json({ error: "الفترة غير موجودة" });
    const summary = await getPeriodSummary(period.id);
    res.json({
      id: period.id,
      year: period.year,
      month: period.month,
      createdAt: period.createdAt.toISOString(),
      label: periodLabel(period.year, period.month),
      summary,
    });
  })
);

router.put(
  "/:id",
  validateBody(updatePeriodSchema),
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const { year, month } = req.body;

    const existing = await prisma.period.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "الفترة غير موجودة" });

    const duplicate = await prisma.period.findFirst({
      where: { year, month, NOT: { id } },
    });
    if (duplicate) {
      return res.status(409).json({ error: "فترة أخرى بنفس الشهر والسنة موجودة مسبقاً" });
    }

    const period = await prisma.period.update({
      where: { id },
      data: { year, month },
    });
    res.json({
      id: period.id,
      year: period.year,
      month: period.month,
      createdAt: period.createdAt.toISOString(),
      label: periodLabel(year, month),
    });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.period.delete({ where: { id: String(req.params.id) } });
    res.json({ ok: true });
  })
);

export default router;
