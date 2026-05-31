import { Router } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { prisma } from "../lib/prisma";
import { parsePeriodFromFilename, toNumber } from "../lib/utils";
import { asyncHandler } from "../lib/asyncHandler";
import { workshopFromExcelRow } from "../lib/workshopImport";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

function cellStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function cellNum(v: unknown): number {
  const n = parseFloat(String(v ?? "0").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

router.post("/", upload.single("file"), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "لم يُرفع ملف" });

  let year = req.body.year ? parseInt(req.body.year, 10) : undefined;
  let month = req.body.month ? parseInt(req.body.month, 10) : undefined;
  if (!year || !month) {
    const parsed = parsePeriodFromFilename(req.file.originalname);
    if (parsed) {
      year = parsed.year;
      month = parsed.month;
    }
  }
  if (!year || !month) {
    return res.status(400).json({
      error: "تعذر تحديد الشهر. أرسل year و month أو استخدم اسم ملف يحتوي على التاريخ",
    });
  }

  const period = await prisma.period.upsert({
    where: { year_month: { year, month } },
    create: { year, month },
    update: {},
  });

  const wb = XLSX.read(req.file.buffer, { type: "buffer" });
  const report = {
    workshops: { imported: 0, errors: [] as string[] },
    expenses: { imported: 0, errors: [] as string[] },
    salaries: { imported: 0, errors: [] as string[] },
    payments: { imported: 0, errors: [] as string[] },
    periodId: period.id,
    year,
    month,
  };

  const categories = await prisma.expenseCategory.findMany();
  const catByLabel = new Map(categories.map((c) => [c.label, c]));
  const employees = await prisma.employee.findMany();
  const empByName = new Map(employees.map((e) => [e.name.trim(), e]));

  // Sheet1 — workshops
  const ws1 = wb.Sheets["Sheet1"] || wb.Sheets[wb.SheetNames[0]];
  if (ws1) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws1, { defval: "" });
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const parsed = workshopFromExcelRow(r);
      if (!parsed) continue;
      try {
        await prisma.workshop.create({
          data: {
            periodId: period.id,
            name: parsed.name,
            totalAmount: parsed.totalAmount,
            receivedAmount: parsed.receivedAmount,
            remainingAmount: parsed.remainingAmount,
            location: parsed.location,
            status: parsed.status,
            sectionType: parsed.sectionType,
            source: parsed.source,
            phone: parsed.phone,
            notes: parsed.notes,
            link: parsed.link,
            deliveryDate: parsed.deliveryDate ? new Date(parsed.deliveryDate) : null,
            receivedDate: parsed.receivedDate ? new Date(parsed.receivedDate) : null,
          },
        });
        report.workshops.imported++;
      } catch (e) {
        report.workshops.errors.push(`صف ${i + 2}: ${(e as Error).message}`);
      }
    }
  }

  // Invoices — expenses
  const inv = wb.Sheets["Invoices"] || wb.Sheets["invoices"];
  if (inv) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(inv, { defval: "" });
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const desc = cellStr(r["البند"] || r["الوصف"] || r["description"]);
      const amount = cellNum(r["المبلغ"] || r["amount"]);
      const catLabel = cellStr(r["الفئة"] || r["category"] || "متفرقات");
      if (!amount || desc.includes("المجموع")) continue;
      const cat = catByLabel.get(catLabel) || categories.find((c) => c.key === "misc");
      if (!cat) {
        report.expenses.errors.push(`صف ${i + 2}: فئة غير معروفة`);
        continue;
      }
      try {
        await prisma.expense.create({
          data: {
            periodId: period.id,
            categoryId: cat.id,
            amount,
            description: desc || null,
          },
        });
        report.expenses.imported++;
      } catch (e) {
        report.expenses.errors.push(`صف ${i + 2}: ${(e as Error).message}`);
      }
    }
  }

  // salary
  const sal = wb.Sheets["salary"] || wb.Sheets["Salary"];
  if (sal) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sal, { defval: "" });
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const empName = cellStr(r["الاسم"] || r["name"] || r["الموظف"]);
      if (!empName || empName.includes("مجموع")) continue;
      try {
        let emp = empByName.get(empName);
        if (!emp) {
          emp = await prisma.employee.create({ data: { name: empName } });
          empByName.set(empName, emp);
        }
        const w1 = cellNum(r["أسبوع 1"] || r["week1"] || r["W1"]);
        const w2 = cellNum(r["أسبوع 2"] || r["week2"] || r["W2"]);
        const w3 = cellNum(r["أسبوع 3"] || r["week3"] || r["W3"]);
        const w4 = cellNum(r["أسبوع 4"] || r["week4"] || r["W4"]);
        const total = w1 + w2 + w3 + w4;
        await prisma.salaryEntry.upsert({
          where: { periodId_employeeId: { periodId: period.id, employeeId: emp.id } },
          create: {
            periodId: period.id,
            employeeId: emp.id,
            week1: w1,
            week2: w2,
            week3: w3,
            week4: w4,
            total,
          },
          update: { week1: w1, week2: w2, week3: w3, week4: w4, total },
        });
        report.salaries.imported++;
      } catch (e) {
        report.salaries.errors.push(`صف ${i + 2}: ${(e as Error).message}`);
      }
    }
  }

  // Paid — payments
  const paid = wb.Sheets["Paid"] || wb.Sheets["paid"];
  if (paid) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(paid, { defval: "" });
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const amount = cellNum(r["القيمة"] || r["المبلغ"] || r["amount"]);
      if (!amount) continue;
      try {
        const empName = cellStr(r["الموظف"] || r["employee"]);
        let employeeId: string | null = null;
        if (empName) {
          let emp = empByName.get(empName);
          if (!emp) {
            emp = await prisma.employee.create({ data: { name: empName } });
            empByName.set(empName, emp);
          }
          employeeId = emp.id;
        }
        await prisma.payment.create({
          data: {
            periodId: period.id,
            invoiceNumber: cellStr(r["رقم الفاتورة"] || r["invoice"]) || null,
            amount,
            rankReceived: cellStr(r["الرتب"] || r["rank"]) || null,
            notes: cellStr(r["ملاحظات"] || r["notes"]) || null,
            employeeId,
          },
        });
        report.payments.imported++;
      } catch (e) {
        report.payments.errors.push(`صف ${i + 2}: ${(e as Error).message}`);
      }
    }
  }

  res.json(report);
}));

export default router;
