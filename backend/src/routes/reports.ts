import { Router } from "express";
import { financialReportQuerySchema } from "@workshop/shared";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import {
  getPeriodSummary,
  sumPeriodSummaries,
  type PeriodSummary,
} from "../lib/periodSummary";
import { periodLabel } from "../lib/utils";
import { validateQuery } from "../middleware/validate";

const router = Router();

router.get(
  "/financial-summary",
  validateQuery(financialReportQuerySchema),
  asyncHandler(async (req, res) => {
    const { periodIds: periodIdsRaw, all: allRaw } = req.query as {
      periodIds?: string;
      all?: string;
    };
    const includeAll = allRaw === "true" || allRaw === "1";
    const periodIds = periodIdsRaw
      ? periodIdsRaw.split(",").map((id) => id.trim()).filter(Boolean)
      : [];

    let periods = await prisma.period.findMany({
      orderBy: [{ year: "asc" }, { month: "asc" }],
    });

    if (!includeAll && periodIds.length > 0) {
      const idSet = new Set(periodIds);
      periods = periods.filter((p) => idSet.has(p.id));
    } else if (!includeAll && periodIds.length === 0) {
      return res.status(400).json({
        error: "حدّد فترات عبر periodIds أو استخدم all=true",
      });
    }

    let cumulativeCash = 0;
    const rows: Array<{
      id: string;
      year: number;
      month: number;
      label: string;
      summary: PeriodSummary;
      cumulativeCash: number;
    }> = [];

    for (const p of periods) {
      const summary = await getPeriodSummary(p.id);
      cumulativeCash += summary.netCashFlow;
      rows.push({
        id: p.id,
        year: p.year,
        month: p.month,
        label: periodLabel(p.year, p.month),
        summary,
        cumulativeCash: Math.round(cumulativeCash * 100) / 100,
      });
    }

    const totals = sumPeriodSummaries(rows.map((r) => r.summary));

    res.json({
      periods: rows,
      totals: {
        ...totals,
        cumulativeCash: totals.netCashFlow,
      },
      meta: {
        periodCount: rows.length,
        allPeriods: includeAll,
      },
    });
  })
);

export default router;
