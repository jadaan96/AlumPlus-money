import { Router } from "express";
import { Prisma } from "@prisma/client";
import {
  calculateMonthlySalary,
  upsertSalarySchema,
  WeekSalaryBreakdown,
} from "@workshop/shared";
import { prisma } from "../lib/prisma";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../lib/asyncHandler";
import { toNumber } from "../lib/utils";

const router = Router();

function padWeeks(weeks: { daysOff: number; overtimeHours: number }[]) {
  const padded = weeks.map((w) => ({
    daysOff: w.daysOff ?? 0,
    overtimeHours: w.overtimeHours ?? 0,
  }));
  while (padded.length < 4) padded.push({ daysOff: 0, overtimeHours: 0 });
  return padded.slice(0, 4);
}

function serializeEmployee(emp: {
  id: string;
  name: string;
  active: boolean;
  weeklySalary: Prisma.Decimal;
}) {
  return {
    id: emp.id,
    name: emp.name,
    active: emp.active,
    weeklySalary: toNumber(emp.weeklySalary),
  };
}

function serializeSalary(s: {
  id: string;
  periodId: string;
  employeeId: string;
  week1: Prisma.Decimal;
  week2: Prisma.Decimal;
  week3: Prisma.Decimal;
  week4: Prisma.Decimal;
  total: Prisma.Decimal;
  weekDetails: unknown;
  employee?: {
    id: string;
    name: string;
    active: boolean;
    weeklySalary: Prisma.Decimal;
  };
}) {
  const weekDetails = (s.weekDetails as WeekSalaryBreakdown[] | null) ?? [];
  return {
    id: s.id,
    periodId: s.periodId,
    employeeId: s.employeeId,
    week1: toNumber(s.week1),
    week2: toNumber(s.week2),
    week3: toNumber(s.week3),
    week4: toNumber(s.week4),
    total: toNumber(s.total),
    weeks: weekDetails,
    employee: s.employee ? serializeEmployee(s.employee) : undefined,
  };
}

/** قائمة الرواتب للفترة + كل الموظفين النشطين (حتى بدون سجل سابق) */
router.get(
  "/period/:periodId",
  asyncHandler(async (req, res) => {
    const periodId = String(req.params.periodId);
    const period = await prisma.period.findUnique({ where: { id: periodId } });
    if (!period) return res.status(404).json({ error: "الفترة غير موجودة" });

    const [employees, entries] = await Promise.all([
      prisma.employee.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
      prisma.salaryEntry.findMany({
        where: { periodId },
        include: { employee: true },
      }),
    ]);

    const entryByEmployee = new Map(entries.map((e) => [e.employeeId, e]));
    const items = employees.map((emp) => {
      const entry = entryByEmployee.get(emp.id);
      if (entry) return serializeSalary(entry);
      const weeklySalary = toNumber(emp.weeklySalary);
      const weekInputs = Array(4).fill(null).map(() => ({
        daysOff: 0,
        overtimeHours: 0,
      }));
      const { weeks, total } = calculateMonthlySalary(weeklySalary, weekInputs);
      return {
        id: null as string | null,
        periodId,
        employeeId: emp.id,
        week1: weeks[0]?.total ?? 0,
        week2: weeks[1]?.total ?? 0,
        week3: weeks[2]?.total ?? 0,
        week4: weeks[3]?.total ?? 0,
        total,
        weeks,
        employee: serializeEmployee(emp),
      };
    });

    const total = items.reduce((sum, e) => sum + e.total, 0);
    res.json({ items, total, periodId });
  })
);

router.post(
  "/upsert",
  validateBody(upsertSalarySchema),
  asyncHandler(async (req, res) => {
    const { periodId, employeeId, weeks } = req.body;

    const [period, employee] = await Promise.all([
      prisma.period.findUnique({ where: { id: periodId } }),
      prisma.employee.findUnique({ where: { id: employeeId } }),
    ]);
    if (!period) return res.status(404).json({ error: "الفترة غير موجودة" });
    if (!employee) return res.status(404).json({ error: "الموظف غير موجود" });

    const weeklySalary = toNumber(employee.weeklySalary);
    if (weeklySalary <= 0) {
      return res.status(400).json({
        error: "حدّد الراتب الأسبوعي للموظف من صفحة الموظفين أولاً",
      });
    }

    const padded = padWeeks(weeks);
    const { weeks: breakdowns, total } = calculateMonthlySalary(weeklySalary, padded);
    const amounts = breakdowns.map((w) => w.total);

    const entry = await prisma.salaryEntry.upsert({
      where: { periodId_employeeId: { periodId, employeeId } },
      create: {
        periodId,
        employeeId,
        week1: amounts[0] ?? 0,
        week2: amounts[1] ?? 0,
        week3: amounts[2] ?? 0,
        week4: amounts[3] ?? 0,
        weekDetails: breakdowns as unknown as Prisma.InputJsonValue,
        total,
      },
      update: {
        week1: amounts[0] ?? 0,
        week2: amounts[1] ?? 0,
        week3: amounts[2] ?? 0,
        week4: amounts[3] ?? 0,
        weekDetails: breakdowns as unknown as Prisma.InputJsonValue,
        total,
      },
      include: { employee: true },
    });

    res.json(serializeSalary(entry));
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.salaryEntry.delete({ where: { id: String(req.params.id) } });
    res.json({ ok: true });
  })
);

export default router;
