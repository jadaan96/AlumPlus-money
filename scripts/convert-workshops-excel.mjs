/**
 * يحوّل Sheet1 من ملف Excel الورش إلى CSV جاهز للاستيراد في صفحة الورش.
 * الاستخدام:
 *   node scripts/convert-workshops-excel.mjs "c:\Users\DELL\Downloads\_دخل شهر 6.xlsx"
 */
import * as fs from "fs";
import * as path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const STANDARD_HEADERS = [
  "اسم الورشة",
  "المبلغ الإجمالي",
  "المكان",
  "المستلم",
  "المتبقي",
  "تاريخ التسليم",
  "تاريخ الاستلام",
  "الحالة",
  "نوع المقطع",
  "المصدر",
  "الهاتف",
  "ملاحظات",
];

function cellStr(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function cellNum(v) {
  const n = parseFloat(String(v ?? "0").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function parseExcelDate(v) {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "number" && v > 1000) {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = cellStr(v);
  if (!s || s.includes("بعد") || s.includes("العيد")) return "";
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return "";
}

const inputPath = process.argv[2] || "c:\\Users\\DELL\\Downloads\\_دخل شهر 6.xlsx";
if (!fs.existsSync(inputPath)) {
  console.error("الملف غير موجود:", inputPath);
  process.exit(1);
}

const wb = XLSX.readFile(inputPath);
const sheetName = wb.SheetNames.includes("Sheet1") ? "Sheet1" : wb.SheetNames[0];
const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" });

const workshops = [];
for (const r of rawRows) {
  const name = cellStr(r["اسم الورشة"] || r["الاسم"]);
  if (!name || name.includes("مجموع")) continue;
  const total = cellNum(r["المبلغ الإجمالي"] || r["المبلغ"]);
  const received = cellNum(r["المستلم"] || r["المبلغ المستلم"]);
  const remaining =
    cellNum(r["المتبقي"] || r["المبلغ المتبقي"]) || Math.max(0, total - received);
  workshops.push({
    "اسم الورشة": name,
    "المبلغ الإجمالي": total,
    المكان: cellStr(r["المكان"] || r["مكانها"]),
    المستلم: received,
    المتبقي: remaining,
    "تاريخ التسليم": parseExcelDate(r["تاريخ التسليم"] || r["تا ريخ التسليم"]),
    "تاريخ الاستلام": parseExcelDate(r["تاريخ الاستلام"]),
    الحالة: cellStr(r["الحالة"]) || "COLLECTING",
    "نوع المقطع": cellStr(r["نوع المقطع"]),
    المصدر: cellStr(r["المصدر"] || r["من وين"] || r["من وين اجت الورشة"]),
    الهاتف: cellStr(r["الهاتف"] || r["رقم التلفون"]),
    ملاحظات: cellStr(r["ملاحظات"] || r["notes"]),
  });
}

// CSV للاستيراد في صفحة الورش (نفس تنسيق التصدير)
const csvHeader =
  "الاسم,الإجمالي,المستلم,المتبقي,الحالة,المكان,نوع المقطع,المصدر,الهاتف,تاريخ التسليم,تاريخ الاستلام,ملاحظات";
const csvRows = workshops.map((w) =>
  [
    w["اسم الورشة"],
    w["المبلغ الإجمالي"],
    w["المستلم"],
    w["المتبقي"],
    w["الحالة"] === "" ? "COLLECTING" : w["الحالة"],
    w["المكان"],
    w["نوع المقطع"],
    w["المصدر"],
    w["الهاتف"],
    w["تاريخ التسليم"],
    w["تاريخ الاستلام"],
    w["ملاحظات"].replace(/,/g, "؛"),
  ].join(",")
);
const csvContent = "\uFEFF" + csvHeader + "\n" + csvRows.join("\n");

const dir = path.dirname(inputPath);
const base = path.basename(inputPath, path.extname(inputPath));
const csvOut = path.join(dir, `${base} - workshops.csv`);
fs.writeFileSync(csvOut, csvContent, "utf8");

// تحديث Sheet1 في Excel بعناوين موحّدة
const fixedAoA = [STANDARD_HEADERS];
for (const w of workshops) {
  fixedAoA.push([
    w["اسم الورشة"],
    w["المبلغ الإجمالي"],
    w["المكان"],
    w["المستلم"],
    w["المتبقي"],
    w["تاريخ التسليم"],
    w["تاريخ الاستلام"],
    w["الحالة"] || "COLLECTING",
    w["نوع المقطع"],
    w["المصدر"],
    w["الهاتف"],
    w["ملاحظات"],
  ]);
}
wb.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(fixedAoA);
XLSX.writeFile(wb, inputPath);

console.log(`تم تحويل ${workshops.length} ورشة`);
console.log("CSV:", csvOut);
console.log("Excel Sheet1 محدّث:", inputPath);
