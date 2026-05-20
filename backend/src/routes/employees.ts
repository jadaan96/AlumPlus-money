import { Router } from "express";
import { Prisma } from "@prisma/client";
import { createEmployeeSchema, updateEmployeeSchema } from "@workshop/shared";
import { prisma } from "../lib/prisma";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../lib/asyncHandler";
import { toNumber } from "../lib/utils";

const router = Router();

function serializeEmployee(e: {
  id: string;
  name: string;
  active: boolean;
  weeklySalary: Prisma.Decimal;
  createdAt: Date;
}) {
  return {
    id: e.id,
    name: e.name,
    active: e.active,
    weeklySalary: toNumber(e.weeklySalary),
    createdAt: e.createdAt.toISOString(),
  };
}

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const employees = await prisma.employee.findMany({ orderBy: { name: "asc" } });
    res.json(employees.map(serializeEmployee));
  })
);

router.post(
  "/",
  validateBody(createEmployeeSchema),
  asyncHandler(async (req, res) => {
    const employee = await prisma.employee.create({ data: req.body });
    res.status(201).json(serializeEmployee(employee));
  })
);

router.put(
  "/:id",
  validateBody(updateEmployeeSchema),
  asyncHandler(async (req, res) => {
    const employee = await prisma.employee.update({
      where: { id: String(req.params.id) },
      data: req.body,
    });
    res.json(serializeEmployee(employee));
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.employee.delete({ where: { id: String(req.params.id) } });
    res.json({ ok: true });
  })
);

export default router;
