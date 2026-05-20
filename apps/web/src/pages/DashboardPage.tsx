import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { usePeriod } from "@/context/PeriodContext";
import { formatMoney } from "@/lib/format";
import { StatCard, PageHeader, Card, Table, Th, Td, Select } from "@/components/ui";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Summary {
  workshopsTotal: number;
  workshopsReceived: number;
  workshopsRemaining: number;
  expensesTotal: number;
  salariesTotal: number;
  paymentsTotal: number;
}

interface TopItem {
  id: string;
  name: string;
  remainingAmount: number;
  phone: string | null;
  status: string;
}

interface ChartPoint {
  label: string;
  income: number;
  expenses: number;
  salaries: number;
}

interface PeriodOption {
  id: string;
  label: string;
}

export default function DashboardPage() {
  const { periodId } = usePeriod();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [topRemaining, setTopRemaining] = useState<TopItem[]>([]);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [periods, setPeriods] = useState<PeriodOption[]>([]);
  const [compareA, setCompareA] = useState("");
  const [compareB, setCompareB] = useState("");
  const [compareData, setCompareData] = useState<{
    periodA: { label: string; summary: Summary };
    periodB: { label: string; summary: Summary };
  } | null>(null);

  useEffect(() => {
    api<PeriodOption[]>("/api/periods").then(setPeriods).catch(console.error);
    api<ChartPoint[]>("/api/dashboard/chart?limit=6").then(setChart).catch(console.error);
  }, []);

  useEffect(() => {
    if (!periodId) return;
    api<{ summary: Summary; topRemaining: TopItem[] }>(
      `/api/dashboard?periodId=${periodId}`
    )
      .then((d) => {
        setSummary(d.summary);
        setTopRemaining(d.topRemaining);
      })
      .catch(console.error);
  }, [periodId]);

  const loadCompare = async () => {
    if (!compareA || !compareB) return;
    const data = await api<typeof compareData>(
      `/api/dashboard/compare?periodA=${compareA}&periodB=${compareB}`
    );
    setCompareData(data);
  };

  if (!periodId) {
    return <p className="text-slate-500">اختر فترة شهرية من القائمة أعلاه</p>;
  }

  return (
    <div>
      <PageHeader title="لوحة التحكم" />

      {summary && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard title="إجمالي الورش" value={formatMoney(summary.workshopsTotal)} />
          <StatCard title="المستلم" value={formatMoney(summary.workshopsReceived)} accent="text-green-600" />
          <StatCard title="المتبقي" value={formatMoney(summary.workshopsRemaining)} accent="text-amber-600" />
          <StatCard title="المصروفات" value={formatMoney(summary.expensesTotal)} accent="text-red-600" />
          <StatCard title="الرواتب" value={formatMoney(summary.salariesTotal)} />
          <StatCard title="المدفوعات" value={formatMoney(summary.paymentsTotal)} />
        </div>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">آخر 6 أشهر — دخل vs مصروف vs رواتب</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatMoney(v)} />
              <Legend />
              <Bar dataKey="income" name="المستلم" fill="#22c55e" />
              <Bar dataKey="expenses" name="مصروفات" fill="#ef4444" />
              <Bar dataKey="salaries" name="رواتب" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">مقارنة شهرين</h2>
          <div className="mb-3 flex flex-wrap gap-2">
            <Select value={compareA} onChange={(e) => setCompareA(e.target.value)} className="flex-1">
              <option value="">الشهر الأول</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </Select>
            <Select value={compareB} onChange={(e) => setCompareB(e.target.value)} className="flex-1">
              <option value="">الشهر الثاني</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </Select>
            <button
              type="button"
              onClick={loadCompare}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700"
            >
              قارن
            </button>
          </div>
          {compareData && (
            <Table>
              <thead>
                <tr>
                  <Th>البند</Th>
                  <Th>{compareData.periodA.label}</Th>
                  <Th>{compareData.periodB.label}</Th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["إجمالي الورش", "workshopsTotal"],
                  ["المستلم", "workshopsReceived"],
                  ["المتبقي", "workshopsRemaining"],
                  ["مصروفات", "expensesTotal"],
                  ["رواتب", "salariesTotal"],
                  ["مدفوعات", "paymentsTotal"],
                ].map(([label, key]) => (
                  <tr key={key}>
                    <Td>{label}</Td>
                    <Td>{formatMoney(compareData.periodA.summary[key as keyof Summary])}</Td>
                    <Td>{formatMoney(compareData.periodB.summary[key as keyof Summary])}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 font-semibold">أعلى 10 متبقي على الزبائن</h2>
        <Table>
          <thead>
            <tr>
              <Th>الاسم</Th>
              <Th>المتبقي</Th>
              <Th>الهاتف</Th>
              <Th>الحالة</Th>
            </tr>
          </thead>
          <tbody>
            {topRemaining.length === 0 ? (
              <tr><Td className="text-center text-slate-400" >لا توجد بيانات</Td></tr>
            ) : (
              topRemaining.map((w) => (
                <tr key={w.id}>
                  <Td>{w.name}</Td>
                  <Td className="font-medium text-amber-600">{formatMoney(w.remainingAmount)}</Td>
                  <Td>{w.phone || "—"}</Td>
                  <Td>{w.status}</Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
