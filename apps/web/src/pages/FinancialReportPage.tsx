import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { PageHeader, Button, Card, Table, Th, Td } from "@/components/ui";

interface PeriodSummary {
  workshopsCount: number;
  workshopsTotal: number;
  workshopsReceived: number;
  workshopsRemaining: number;
  expensesTotal: number;
  salariesTotal: number;
  paymentsTotal: number;
  paymentsToEmployees: number;
  paymentsGeneral: number;
  netCashFlow: number;
  salaryRemaining: number;
}

interface PeriodRow {
  id: string;
  year: number;
  month: number;
  label: string;
  summary: PeriodSummary;
  cumulativeCash: number;
}

interface ReportData {
  periods: PeriodRow[];
  totals: PeriodSummary & { cumulativeCash: number };
  meta: { periodCount: number; allPeriods: boolean };
}

interface PeriodOption {
  id: string;
  label: string;
}

export default function FinancialReportPage() {
  const [allPeriods, setAllPeriods] = useState<PeriodOption[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadReport = async (ids?: Set<string>) => {
    const sel = ids ?? selected;
    if (sel.size === 0) return;
    setLoading(true);
    try {
      const q =
        sel.size === allPeriods.length && allPeriods.length > 0
          ? "all=true"
          : `periodIds=${[...sel].join(",")}`;
      const data = await api<ReportData>(`/api/reports/financial-summary?${q}`);
      setReport(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api<PeriodOption[]>("/api/periods").then((list) => {
      setAllPeriods(list);
      const all = new Set(list.map((p) => p.id));
      setSelected(all);
      loadReport(all).catch(console.error);
    });
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(allPeriods.map((p) => p.id)));
  const clearAll = () => setSelected(new Set());

  const t = report?.totals;

  return (
    <div>
      <PageHeader title="التقرير المالي الشامل">
        <Button onClick={() => loadReport()} disabled={loading || selected.size === 0}>
          {loading ? "جاري التحميل..." : "تحديث التقرير"}
        </Button>
      </PageHeader>

      <Card className="mb-4 text-sm text-slate-600">
        <p className="font-medium text-slate-800">كيف يُحسب التقرير؟</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            <strong>الكاش التراكمي</strong> = مجموع (المستلم من الورش − المصروفات − كل المدفوعات) للأشهر
            المحددة بالترتيب الزمني
          </li>
          <li>
            <strong>ذمم الزبائن</strong> = مجموع المتبقي على الورش (ما لم يُحصّل بعد من العملاء)
          </li>
          <li>
            <strong>ذمم الموظفين</strong> = الرواتب المسجّلة − المدفوعات المربوطة بموظف
          </li>
          <li>لا يشمل رصيد افتتاحي قديم — إن وُجد كاش سابق، أضفه يدوياً للمقارنة</li>
        </ul>
      </Card>

      <Card className="mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-700">الفترات المشمولة:</span>
          <Button variant="secondary" onClick={selectAll}>
            تحديد الكل
          </Button>
          <Button variant="ghost" onClick={clearAll}>
            إلغاء التحديد
          </Button>
          <span className="text-xs text-slate-500">
            ({selected.size} من {allPeriods.length})
          </span>
        </div>
        <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
          {allPeriods.map((p) => (
            <label
              key={p.id}
              className={`cursor-pointer rounded-full border px-3 py-1 text-sm transition ${
                selected.has(p.id)
                  ? "border-primary-600 bg-primary-50 text-primary-800"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={selected.has(p.id)}
                onChange={() => toggle(p.id)}
              />
              {p.label}
            </label>
          ))}
        </div>
      </Card>

      {t && (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-primary-200 bg-primary-50/50">
              <p className="text-sm text-slate-600">الكاش التراكمي (المفترض معك)</p>
              <p className="text-2xl font-bold text-primary-700">
                {formatMoney(t.cumulativeCash)}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-slate-600">مجموع ذمم الزبائن</p>
              <p className="text-2xl font-bold text-amber-600">
                {formatMoney(t.workshopsRemaining)}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-slate-600">مجموع ذمم الموظفين (رواتب)</p>
              <p className="text-2xl font-bold text-red-600">
                {formatMoney(t.salaryRemaining)}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-slate-600">إجمالي المستلم من الورش</p>
              <p className="text-2xl font-bold text-green-600">
                {formatMoney(t.workshopsReceived)}
              </p>
            </Card>
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <p className="text-xs text-slate-500">قيمة الورش (إجمالي)</p>
              <p className="font-semibold">{formatMoney(t.workshopsTotal)}</p>
            </Card>
            <Card>
              <p className="text-xs text-slate-500">المصروفات</p>
              <p className="font-semibold text-red-600">{formatMoney(t.expensesTotal)}</p>
            </Card>
            <Card>
              <p className="text-xs text-slate-500">الرواتب المسجّلة</p>
              <p className="font-semibold">{formatMoney(t.salariesTotal)}</p>
            </Card>
            <Card>
              <p className="text-xs text-slate-500">مدفوعات موظفين</p>
              <p className="font-semibold">{formatMoney(t.paymentsToEmployees)}</p>
            </Card>
            <Card>
              <p className="text-xs text-slate-500">مدفوعات أخرى</p>
              <p className="font-semibold">{formatMoney(t.paymentsGeneral)}</p>
            </Card>
            <Card>
              <p className="text-xs text-slate-500">صافي الكاش (مجموع الأشهر)</p>
              <p className="font-semibold">{formatMoney(t.netCashFlow)}</p>
            </Card>
          </div>

          <Card className="overflow-x-auto">
            <h2 className="mb-4 font-semibold">تفصيل حسب الشهر</h2>
            <Table>
              <thead>
                <tr>
                  <Th>الفترة</Th>
                  <Th>ورش</Th>
                  <Th>إجمالي ورش</Th>
                  <Th>مستلم</Th>
                  <Th>ذمم زبائن</Th>
                  <Th>مصروفات</Th>
                  <Th>رواتب</Th>
                  <Th>مدفوع موظفين</Th>
                  <Th>مدفوع آخر</Th>
                  <Th>ذمم رواتب</Th>
                  <Th>صافي كاش</Th>
                  <Th>كاش تراكمي</Th>
                </tr>
              </thead>
              <tbody>
                {report.periods.map((p) => (
                  <tr key={p.id} className="text-sm">
                    <Td className="font-medium whitespace-nowrap">{p.label}</Td>
                    <Td>{p.summary.workshopsCount}</Td>
                    <Td>{formatMoney(p.summary.workshopsTotal)}</Td>
                    <Td className="text-green-700">{formatMoney(p.summary.workshopsReceived)}</Td>
                    <Td className="text-amber-600">
                      {formatMoney(p.summary.workshopsRemaining)}
                    </Td>
                    <Td className="text-red-600">{formatMoney(p.summary.expensesTotal)}</Td>
                    <Td>{formatMoney(p.summary.salariesTotal)}</Td>
                    <Td>{formatMoney(p.summary.paymentsToEmployees)}</Td>
                    <Td>{formatMoney(p.summary.paymentsGeneral)}</Td>
                    <Td>{formatMoney(p.summary.salaryRemaining)}</Td>
                    <Td
                      className={
                        p.summary.netCashFlow >= 0 ? "text-green-700" : "text-red-600"
                      }
                    >
                      {formatMoney(p.summary.netCashFlow)}
                    </Td>
                    <Td className="font-semibold text-primary-700">
                      {formatMoney(p.cumulativeCash)}
                    </Td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold">
                  <Td>المجموع</Td>
                  <Td>{t.workshopsCount}</Td>
                  <Td>{formatMoney(t.workshopsTotal)}</Td>
                  <Td>{formatMoney(t.workshopsReceived)}</Td>
                  <Td>{formatMoney(t.workshopsRemaining)}</Td>
                  <Td>{formatMoney(t.expensesTotal)}</Td>
                  <Td>{formatMoney(t.salariesTotal)}</Td>
                  <Td>{formatMoney(t.paymentsToEmployees)}</Td>
                  <Td>{formatMoney(t.paymentsGeneral)}</Td>
                  <Td>{formatMoney(t.salaryRemaining)}</Td>
                  <Td>{formatMoney(t.netCashFlow)}</Td>
                  <Td>{formatMoney(t.cumulativeCash)}</Td>
                </tr>
              </tbody>
            </Table>
          </Card>
        </>
      )}

      {!report && !loading && (
        <p className="text-slate-500">اختر فترة واحدة على الأقل واضغط «تحديث التقرير»</p>
      )}
    </div>
  );
}
