import { useState, FormEvent } from "react";
import { usePeriod } from "@/context/PeriodContext";
import { getAccessToken } from "@/lib/api";
import { PageHeader, Button, Input, Label, Card } from "@/components/ui";

interface ImportReport {
  periodId: string;
  year: number;
  month: number;
  workshops: { imported: number; errors: string[] };
  expenses: { imported: number; errors: string[] };
  salaries: { imported: number; errors: string[] };
  payments: { imported: number; errors: string[] };
}

export default function ImportPage() {
  const { periodId } = usePeriod();
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError("");
    setReport(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("year", String(year));
    fd.append("month", String(month));
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        credentials: "include",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الاستيراد");
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="استيراد Excel" />
      <Card className="max-w-lg">
        <p className="mb-4 text-sm text-slate-600">
          ارفع ملف `.xlsx` بأوراق: Sheet1 (ورش)، Invoices (مصروفات)، salary (رواتب)، Paid (مدفوعات).
          يمكن استخراج الشهر من اسم الملف مثل «دخل شهر 5» أو تحديده يدوياً.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>ملف Excel</Label>
            <Input type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>السنة</Label><Input type="number" value={year} onChange={(e) => setYear(+e.target.value)} /></div>
            <div><Label>الشهر</Label><Input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(+e.target.value)} /></div>
          </div>
          {periodId && <p className="text-xs text-slate-400">الفترة المحددة حالياً: سيتم الدمج أو الإنشاء حسب السنة/الشهر أعلاه</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading || !file}>
            {loading ? "جاري الاستيراد..." : "استيراد"}
          </Button>
        </form>
      </Card>

      {report && (
        <Card className="mt-6 max-w-2xl">
          <h2 className="mb-3 font-semibold">تقرير الاستيراد — {report.year}/{report.month}</h2>
          <ul className="space-y-2 text-sm">
            <li>الورش: {report.workshops.imported} مستورد — {report.workshops.errors.length} أخطاء</li>
            <li>المصروفات: {report.expenses.imported} — {report.expenses.errors.length} أخطاء</li>
            <li>الرواتب: {report.salaries.imported} — {report.salaries.errors.length} أخطاء</li>
            <li>المدفوعات: {report.payments.imported} — {report.payments.errors.length} أخطاء</li>
          </ul>
          {[...report.workshops.errors, ...report.expenses.errors, ...report.salaries.errors, ...report.payments.errors].length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-red-600">عرض الأخطاء</summary>
              <ul className="mt-2 max-h-48 overflow-auto text-xs text-red-700">
                {[...report.workshops.errors, ...report.expenses.errors, ...report.salaries.errors, ...report.payments.errors].map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </details>
          )}
        </Card>
      )}
    </div>
  );
}
