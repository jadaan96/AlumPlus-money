import * as XLSX from "xlsx";
import { WorkshopStatus } from "@prisma/client";
import { calcRemaining } from "./utils";

export function cellStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

export function cellNum(v: unknown): number {
  const n = parseFloat(String(v ?? "0").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function mapStatus(raw: string): WorkshopStatus {
  const s = raw.trim().toUpperCase();
  if (s === "COMPLETED" || raw.includes("مكتمل")) return "COMPLETED";
  if (s === "OVERDUE" || raw.includes("متأخر")) return "OVERDUE";
  if (s === "CANCELLED" || raw.includes("ملغ")) return "CANCELLED";
  if (s === "COLLECTING" || raw.includes("تحصيل")) return "COLLECTING";
  return "COLLECTING";
}

export function parseExcelDate(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && v > 1000) {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) {
      return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    }
  }
  const s = cellStr(v);
  if (!s || s.includes("بعد") || s.includes("العيد")) return null;
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

/** يقرأ صف ورشة من Excel (Sheet1) بأسماء الأعمدة العربية الشائعة */
export function workshopFromExcelRow(r: Record<string, unknown>) {
  const name = cellStr(
    r["اسم الورشة"] ||
      r["الاسم"] ||
      r["name"] ||
      r["Name"] ||
      Object.values(r)[0]
  );
  if (!name || name === "المجموع" || name.includes("مجموع")) return null;

  const total = cellNum(
    r["المبلغ الإجمالي"] || r["الإجمالي"] || r["المبلغ"] || r["total"]
  );
  const received = cellNum(
    r["المستلم"] || r["المبلغ المستلم"] || r["received"]
  );
  const remaining = calcRemaining(
    total,
    received,
    cellNum(r["المتبقي"] || r["المبلغ المتبقي"]) || null
  );

  return {
    name,
    totalAmount: total,
    receivedAmount: received,
    remainingAmount: remaining,
    location:
      cellStr(r["المكان"] || r["مكانها"] || r["location"]) || null,
    status: mapStatus(cellStr(r["الحالة"] || r["status"])),
    sectionType: cellStr(r["نوع المقطع"]) || null,
    source:
      cellStr(r["المصدر"] || r["من وين"] || r["من وين اجت الورشة"]) || null,
    phone: cellStr(r["الهاتف"] || r["رقم التلفون"] || r["phone"]) || null,
    notes: cellStr(r["ملاحظات"] || r["notes"]) || null,
    link: cellStr(r["رابط"] || r["link"]) || null,
    deliveryDate: parseExcelDate(
      r["تاريخ التسليم"] || r["تا ريخ التسليم"] || r["deliveryDate"]
    ),
    receivedDate: parseExcelDate(
      r["تاريخ الاستلام"] || r["receivedDate"]
    ),
  };
}

const CSV_HEADERS = [
  "الاسم",
  "الإجمالي",
  "المستلم",
  "المتبقي",
  "الحالة",
  "المكان",
  "نوع المقطع",
  "المصدر",
  "الهاتف",
  "تاريخ التسليم",
  "تاريخ الاستلام",
  "ملاحظات",
] as const;

type WorkshopField =
  | "name"
  | "totalAmount"
  | "receivedAmount"
  | "remainingAmount"
  | "status"
  | "location"
  | "sectionType"
  | "source"
  | "phone"
  | "deliveryDate"
  | "receivedDate"
  | "notes";

const CSV_ALIASES: Record<string, WorkshopField> = {
  الاسم: "name",
  name: "name",
  "اسم الورشة": "name",
  الإجمالي: "totalAmount",
  "المبلغ الإجمالي": "totalAmount",
  المبلغ: "totalAmount",
  total: "totalAmount",
  المستلم: "receivedAmount",
  "المبلغ المستلم": "receivedAmount",
  received: "receivedAmount",
  المتبقي: "remainingAmount",
  "المبلغ المتبقي": "remainingAmount",
  remaining: "remainingAmount",
  الحالة: "status",
  status: "status",
  المكان: "location",
  مكانها: "location",
  location: "location",
  "نوع المقطع": "sectionType",
  المصدر: "source",
  "من وين": "source",
  "من وين اجت الورشة": "source",
  source: "source",
  الهاتف: "phone",
  "رقم التلفون": "phone",
  phone: "phone",
  "تاريخ التسليم": "deliveryDate",
  "تا ريخ التسليم": "deliveryDate",
  "تاريخ الاستلام": "receivedDate",
  ملاحظات: "notes",
  notes: "notes",
};

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/** يحلّل ملف CSV للورش (نفس تنسيق التصدير) */
export function parseWorkshopsCsv(text: string) {
  const raw = text.replace(/^\uFEFF/, "").trim();
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return { rows: [] as NonNullable<ReturnType<typeof workshopFromExcelRow>>[], errors: ["الملف فارغ أو بدون بيانات"] };
  }

  const headerCells = parseCsvLine(lines[0]);
  const headerMap = new Map<number, string>();
  headerCells.forEach((h, i) => {
    const key = CSV_ALIASES[h.trim()];
    if (key) headerMap.set(i, key);
  });

  const hasName = [...headerMap.values()].includes("name");
  if (!hasName) {
    return {
      rows: [],
      errors: [`رأس CSV يجب أن يحتوي «الاسم» أو «اسم الورشة». الأعمدة: ${headerCells.join(" | ")}`],
    };
  }

  const rows: NonNullable<ReturnType<typeof workshopFromExcelRow>>[] = [];
  const errors: string[] = [];

  for (let li = 1; li < lines.length; li++) {
    const cells = parseCsvLine(lines[li]);
    if (cells.every((c) => !c)) continue;

    const obj: Record<string, unknown> = {};
    headerMap.forEach((field, idx) => {
      obj[field] = cells[idx] ?? "";
    });

    const name = cellStr(obj.name);
    if (!name || name.includes("مجموع")) continue;

    try {
      const total = cellNum(obj.totalAmount);
      const received = cellNum(obj.receivedAmount);
      const remaining = calcRemaining(
        total,
        received,
        obj.remainingAmount !== undefined && obj.remainingAmount !== ""
          ? cellNum(obj.remainingAmount)
          : null
      );
      const statusRaw = cellStr(obj.status);
      rows.push({
        name,
        totalAmount: total,
        receivedAmount: received,
        remainingAmount: remaining,
        location: cellStr(obj.location) || null,
        status: statusRaw ? mapStatus(statusRaw) : "COLLECTING",
        sectionType: cellStr(obj.sectionType) || null,
        source: cellStr(obj.source) || null,
        phone: cellStr(obj.phone) || null,
        notes: cellStr(obj.notes) || null,
        link: null,
        deliveryDate: parseExcelDate(obj.deliveryDate),
        receivedDate: parseExcelDate(obj.receivedDate),
      });
    } catch (e) {
      errors.push(`سطر ${li + 1}: ${(e as Error).message}`);
    }
  }

  return { rows, errors };
}

export function workshopsToCsv(
  rows: NonNullable<ReturnType<typeof workshopFromExcelRow>>[]
): string {
  const header = CSV_HEADERS.join(",");
  const body = rows
    .map((w) =>
      [
        w.name,
        w.totalAmount,
        w.receivedAmount,
        w.remainingAmount,
        w.status,
        w.location || "",
        w.sectionType || "",
        w.source || "",
        w.phone || "",
        w.deliveryDate || "",
        w.receivedDate || "",
        (w.notes || "").replace(/,/g, "؛"),
      ].join(",")
    )
    .join("\n");
  return "\uFEFF" + header + "\n" + body;
}

export { CSV_HEADERS };
