import { Router } from "express";
import { Prisma } from "@prisma/client";
import {
  createWorkshopSchema,
  updateWorkshopSchema,
  workshopQuerySchema,
} from "@workshop/shared";
import { prisma } from "../lib/prisma";
import { validateBody, validateQuery } from "../middleware/validate";
import { asyncHandler } from "../lib/asyncHandler";
import { calcRemaining, toNumber } from "../lib/utils";

const router = Router();

function serializeWorkshop(w: {
  id: string;
  periodId: string;
  name: string;
  totalAmount: Prisma.Decimal;
  location: string | null;
  receivedAmount: Prisma.Decimal;
  remainingAmount: Prisma.Decimal;
  deliveryDate: Date | null;
  receivedDate: Date | null;
  status: string;
  sectionType: string | null;
  source: string | null;
  phone: string | null;
  notes: string | null;
  link: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: w.id,
    periodId: w.periodId,
    name: w.name,
    totalAmount: toNumber(w.totalAmount),
    location: w.location,
    receivedAmount: toNumber(w.receivedAmount),
    remainingAmount: toNumber(w.remainingAmount),
    deliveryDate: w.deliveryDate?.toISOString().slice(0, 10) ?? null,
    receivedDate: w.receivedDate?.toISOString().slice(0, 10) ?? null,
    status: w.status,
    sectionType: w.sectionType,
    source: w.source,
    phone: w.phone,
    notes: w.notes,
    link: w.link,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  };
}

router.get(
  "/period/:periodId",
  validateQuery(workshopQuerySchema),
  asyncHandler(async (req, res) => {
    const periodId = String(req.params.periodId);
    const period = await prisma.period.findUnique({ where: { id: periodId } });
    if (!period) return res.status(404).json({ error: "الفترة غير موجودة" });

    const { search, status } = req.query as { search?: string; status?: string };
    const where: Prisma.WorkshopWhereInput = {
      periodId,
      ...(status ? { status: status as never } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    };
    const workshops = await prisma.workshop.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    res.json(workshops.map(serializeWorkshop));
  })
);

router.get(
  "/period/:periodId/export",
  asyncHandler(async (req, res) => {
    const periodId = String(req.params.periodId);
    const period = await prisma.period.findUnique({ where: { id: periodId } });
    if (!period) return res.status(404).json({ error: "الفترة غير موجودة" });

    const workshops = await prisma.workshop.findMany({
      where: { periodId },
      orderBy: { name: "asc" },
    });
    const header =
      "الاسم,الإجمالي,المستلم,المتبقي,الحالة,المكان,نوع المقطع,المصدر,الهاتف,تاريخ التسليم,تاريخ الاستلام,ملاحظات\n";
    const rows = workshops
      .map((w) => {
        const s = serializeWorkshop(w);
        return [
          s.name,
          s.totalAmount,
          s.receivedAmount,
          s.remainingAmount,
          s.status,
          s.location || "",
          s.sectionType || "",
          s.source || "",
          s.phone || "",
          s.deliveryDate || "",
          s.receivedDate || "",
          (s.notes || "").replace(/,/g, "؛"),
        ].join(",");
      })
      .join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="workshops-${periodId}.csv"`
    );
    res.send("\uFEFF" + header + rows);
  })
);

router.post(
  "/",
  validateBody(createWorkshopSchema),
  asyncHandler(async (req, res) => {
    const data = req.body;
    const period = await prisma.period.findUnique({ where: { id: data.periodId } });
    if (!period) return res.status(404).json({ error: "الفترة غير موجودة" });

    const remaining = calcRemaining(
      data.totalAmount,
      data.receivedAmount,
      data.remainingAmount
    );
    const workshop = await prisma.workshop.create({
      data: {
        periodId: data.periodId,
        name: data.name,
        totalAmount: data.totalAmount,
        location: data.location,
        receivedAmount: data.receivedAmount,
        remainingAmount: remaining,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
        receivedDate: data.receivedDate ? new Date(data.receivedDate) : null,
        status: data.status,
        sectionType: data.sectionType,
        source: data.source,
        phone: data.phone,
        notes: data.notes,
        link: data.link,
      },
    });
    res.status(201).json(serializeWorkshop(workshop));
  })
);

router.put(
  "/:id",
  validateBody(updateWorkshopSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.workshop.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!existing) return res.status(404).json({ error: "الورشة غير موجودة" });
    const data = req.body;
    const total = data.totalAmount ?? toNumber(existing.totalAmount);
    const received = data.receivedAmount ?? toNumber(existing.receivedAmount);
    const remaining = calcRemaining(total, received, data.remainingAmount);
    const workshop = await prisma.workshop.update({
      where: { id: String(req.params.id) },
      data: {
        ...data,
        remainingAmount: remaining,
        deliveryDate:
          data.deliveryDate !== undefined
            ? data.deliveryDate
              ? new Date(data.deliveryDate)
              : null
            : undefined,
        receivedDate:
          data.receivedDate !== undefined
            ? data.receivedDate
              ? new Date(data.receivedDate)
              : null
            : undefined,
      },
    });
    res.json(serializeWorkshop(workshop));
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.workshop.delete({ where: { id: String(req.params.id) } });
    res.json({ ok: true });
  })
);

export default router;
