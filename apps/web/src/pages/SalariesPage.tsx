import { Fragment, useEffect, useState, useMemo, FormEvent } from "react";
import { api } from "@/lib/api";
import { usePeriod } from "@/context/PeriodContext";
import { formatMoney } from "@/lib/format";
import {
  calculateWeeklySalary,
  HOURS_DEDUCTED_PER_DAY_OFF,
  OVERTIME_MULTIPLIER,
  STANDARD_DAILY_HOURS,
  STANDARD_WEEKLY_HOURS,
  type WeekSalaryBreakdown,
} from "@workshop/shared";
import {
  PageHeader,
  Button,
  Table,
  Th,
  Td,
  Input,
  Label,
  Card,
  Modal,
} from "@/components/ui";

interface Employee {
  id: string;
  name: string;
  active: boolean;
  weeklySalary: number;
}

interface WeekInput {
  daysOff: number;
  overtimeHours: number;
}

interface SalaryEntry {
  id: string | null;
  employeeId: string;
  total: number;
  weeks: WeekSalaryBreakdown[];
  employee?: Employee;
}

interface Payment {
  id: string;
  invoiceNumber: string | null;
  amount: number;
  paymentDate: string;
  rankReceived: string | null;
  notes: string | null;
  employeeId: string | null;
  employee: { id: string; name: string } | null;
}

const emptyWeek = (): WeekInput => ({ daysOff: 0, overtimeHours: 0 });

const defaultWeeks = (): WeekInput[] => [
  emptyWeek(),
  emptyWeek(),
  emptyWeek(),
  emptyWeek(),
];

const emptyPaymentForm = (employeeId = "") => ({
  invoiceNumber: "",
  amount: 0,
  paymentDate: new Date().toISOString().slice(0, 10),
  employeeId,
  rankReceived: "",
  notes: "",
});

function WeekBlock({
  weekNum,
  weeklySalary,
  data,
  onChange,
}: {
  weekNum: number;
  weeklySalary: number;
  data: WeekInput;
  onChange: (patch: Partial<WeekInput>) => void;
}) {
  const calc = useMemo(
    () => calculateWeeklySalary(weeklySalary, data),
    [weeklySalary, data.daysOff, data.overtimeHours]
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="mb-2 text-sm font-semibold text-slate-700">أسبوع {weekNum}</p>
      <div className="mb-2 grid gap-2 sm:grid-cols-2">
        <div>
          <Label>أيام عطلة</Label>
          <Input
            type="number"
            min={0}
            step="1"
            value={data.daysOff}
            onChange={(e) => onChange({ daysOff: +e.target.value })}
          />
        </div>
        <div>
          <Label>ساعات إضافي</Label>
          <Input
            type="number"
            min={0}
            step="0.5"
            value={data.overtimeHours}
            onChange={(e) => onChange({ overtimeHours: +e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-1 text-xs text-slate-600">
        <p>
          خصم من الإضافي (عطل): {data.daysOff} × {HOURS_DEDUCTED_PER_DAY_OFF} ={" "}
          <strong>{Math.min(data.daysOff * HOURS_DEDUCTED_PER_DAY_OFF, data.overtimeHours)}</strong>{" "}
          ساعة
        </p>
        <p>
          ساعات إضافي صافية: <strong>{calc.netOvertimeHours}</strong>
        </p>
        {calc.overtimeAtNormalHours > 0 && (
          <p>
            إضافي فوق {STANDARD_DAILY_HOURS} ساعات دوام:{" "}
            <strong>{calc.overtimeAtNormalHours}</strong> ساعة بسعر عادي (
            {formatMoney(calc.hourlyRate)}/س)
          </p>
        )}
        {calc.overtimeAtPremiumHours > 0 && (
          <p>
            بمعامل ×{OVERTIME_MULTIPLIER}: <strong>{calc.overtimeAtPremiumHours}</strong> ساعة ={" "}
            {formatMoney(calc.overtimePayAtPremium)}
          </p>
        )}
        <p>
          سعر الساعة الاعتيادية: <strong>{formatMoney(calc.hourlyRate)}</strong>
        </p>
        <p>
          أجر الإضافي الكلي:{" "}
          <strong className="text-green-700">{formatMoney(calc.overtimePay)}</strong>
        </p>
        <p className="border-t border-slate-200 pt-1 text-sm font-bold text-primary-700">
          الراتب المستحق: {formatMoney(calc.total)}
        </p>
      </div>
    </div>
  );
}

function PaymentForm({
  form,
  setForm,
  onSubmit,
  submitLabel,
}: {
  form: ReturnType<typeof emptyPaymentForm>;
  setForm: React.Dispatch<React.SetStateAction<ReturnType<typeof emptyPaymentForm>>>;
  onSubmit: (e: FormEvent) => void;
  submitLabel: string;
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <Label>رقم الفاتورة</Label>
        <Input
          value={form.invoiceNumber}
          onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
        />
      </div>
      <div>
        <Label>المبلغ</Label>
        <Input
          type="number"
          min={0}
          step="0.01"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: +e.target.value })}
          required
        />
      </div>
      <div>
        <Label>التاريخ</Label>
        <Input
          type="date"
          value={form.paymentDate}
          onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
        />
      </div>
      <div>
        <Label>الرتب المستلم</Label>
        <Input
          value={form.rankReceived}
          onChange={(e) => setForm({ ...form, rankReceived: e.target.value })}
        />
      </div>
      <div className="sm:col-span-2">
        <Label>ملاحظات</Label>
        <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      <div className="flex items-end">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}

export default function SalariesPage() {
  const { periodId } = usePeriod();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salaryTotal, setSalaryTotal] = useState(0);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [weekData, setWeekData] = useState<Record<string, WeekInput[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [paymentModal, setPaymentModal] = useState<{ open: boolean; employeeId: string }>({
    open: false,
    employeeId: "",
  });
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm());

  const paymentsByEmployee = useMemo(() => {
    const map = new Map<string, Payment[]>();
    for (const p of payments) {
      if (!p.employeeId) continue;
      const list = map.get(p.employeeId) ?? [];
      list.push(p);
      map.set(p.employeeId, list);
    }
    return map;
  }, [payments]);

  const generalPayments = useMemo(
    () => payments.filter((p) => !p.employeeId),
    [payments]
  );

  const paidForEmployee = (empId: string) =>
    (paymentsByEmployee.get(empId) ?? []).reduce((s, p) => s + p.amount, 0);

  const load = async () => {
    if (!periodId) return;
    const [sal, pay] = await Promise.all([
      api<{ items: SalaryEntry[]; total: number }>(`/api/salaries/period/${periodId}`),
      api<{ items: Payment[]; total: number }>(`/api/payments/period/${periodId}`),
    ]);

    const active = sal.items
      .map((s) => s.employee)
      .filter((e): e is Employee => Boolean(e));
    setEmployees(active);
    setSalaryTotal(sal.total);
    setPayments(pay.items);
    setPaymentsTotal(pay.total);

    const map: Record<string, WeekInput[]> = {};
    for (const item of sal.items) {
      if (item.weeks?.length) {
        map[item.employeeId] = item.weeks.map((w) => ({
          daysOff: w.daysOff,
          overtimeHours: w.overtimeHours,
        }));
        while (map[item.employeeId].length < 4) map[item.employeeId].push(emptyWeek());
      } else {
        map[item.employeeId] = defaultWeeks();
      }
    }
    setWeekData(map);
  };

  useEffect(() => {
    load().catch(console.error);
  }, [periodId]);

  const updateWeek = (empId: string, weekIdx: number, patch: Partial<WeekInput>) => {
    setWeekData((prev) => {
      const weeks = [...(prev[empId] || defaultWeeks())];
      weeks[weekIdx] = { ...weeks[weekIdx], ...patch };
      return { ...prev, [empId]: weeks };
    });
  };

  const rowPreviewTotal = (empId: string, weeklySalary: number) => {
    const weeks = weekData[empId] || defaultWeeks();
    return weeks.reduce((s, w) => s + calculateWeeklySalary(weeklySalary, w).total, 0);
  };

  const saveRow = async (employeeId: string) => {
    if (!periodId) return;
    const weeks = weekData[employeeId] || defaultWeeks();
    await api("/api/salaries/upsert", {
      method: "POST",
      body: JSON.stringify({ periodId, employeeId, weeks }),
    });
    await load();
  };

  const openPaymentModal = (employeeId: string) => {
    setPaymentForm(emptyPaymentForm(employeeId));
    setPaymentModal({ open: true, employeeId });
  };

  const submitPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!periodId) return;
    await api("/api/payments", {
      method: "POST",
      body: JSON.stringify({
        ...paymentForm,
        periodId,
        employeeId: paymentForm.employeeId || null,
      }),
    });
    setPaymentModal({ open: false, employeeId: "" });
    await load();
  };

  const deletePayment = async (id: string) => {
    if (!confirm("حذف هذه الدفعة؟")) return;
    await api(`/api/payments/${id}`, { method: "DELETE" });
    await load();
  };

  if (!periodId) return <p className="text-slate-500">اختر فترة أولاً</p>;

  const remaining = salaryTotal - paymentsTotal;

  return (
    <div>
      <PageHeader title="الرواتب والمدفوعات">
        <Button variant="secondary" onClick={() => openPaymentModal("")}>
          دفعة عامة
        </Button>
      </PageHeader>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">مجموع الرواتب المستحقة</p>
          <p className="text-2xl font-bold text-primary-700">{formatMoney(salaryTotal)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">مجموع المدفوعات</p>
          <p className="text-2xl font-bold text-green-600">{formatMoney(paymentsTotal)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">المتبقي (رواتب − مدفوعات)</p>
          <p
            className={`text-2xl font-bold ${remaining > 0 ? "text-amber-600" : remaining < 0 ? "text-red-600" : "text-slate-700"}`}
          >
            {formatMoney(remaining)}
          </p>
        </Card>
      </div>

      <Card className="mb-4 text-sm text-slate-600">
        <p className="font-medium text-slate-800">طريقة حساب الراتب</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>سعر الساعة = الراتب الأسبوعي ÷ {STANDARD_WEEKLY_HOURS} ساعة</li>
          <li>كل يوم عطلة يخصم {HOURS_DEDUCTED_PER_DAY_OFF} ساعات من الإضافي</li>
          <li>ساعات إضافي صافية = الإضافي − (أيام العطلة × {HOURS_DEDUCTED_PER_DAY_OFF})</li>
          <li>
            ساعات الدوام اليومية ثابتة = {STANDARD_DAILY_HOURS} — إذا الإضافي الصافي أكبر، الفرق
            بسعر عادي
          </li>
          <li>الباقي من الإضافي يُحسب بمعامل ×{OVERTIME_MULTIPLIER}</li>
        </ul>
      </Card>

      <Table>
        <thead>
          <tr>
            <Th>الموظف</Th>
            <Th>الراتب الأسبوعي</Th>
            <Th>المستحق (الشهر)</Th>
            <Th>المدفوع</Th>
            <Th>المتبقي</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => {
            const due = rowPreviewTotal(emp.id, emp.weeklySalary || 0);
            const paid = paidForEmployee(emp.id);
            const balance = due - paid;
            const noSalary = !emp.weeklySalary;
            const empPayments = paymentsByEmployee.get(emp.id) ?? [];

            return (
              <Fragment key={emp.id}>
                <tr className={noSalary ? "bg-amber-50" : ""}>
                  <Td className="font-medium">{emp.name}</Td>
                  <Td>{formatMoney(emp.weeklySalary || 0)}</Td>
                  <Td className="font-semibold text-primary-700">{formatMoney(due)}</Td>
                  <Td className="text-green-700">{formatMoney(paid)}</Td>
                  <Td
                    className={
                      balance > 0
                        ? "font-medium text-amber-600"
                        : balance < 0
                          ? "text-red-600"
                          : ""
                    }
                  >
                    {formatMoney(balance)}
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        variant="ghost"
                        onClick={() => setExpanded(expanded === emp.id ? null : emp.id)}
                        disabled={noSalary}
                      >
                        {expanded === emp.id ? "إخفاء" : "تفاصيل"}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => saveRow(emp.id)}
                        disabled={noSalary}
                      >
                        حفظ الراتب
                      </Button>
                      <Button onClick={() => openPaymentModal(emp.id)}>دفعة</Button>
                    </div>
                  </Td>
                </tr>
                {expanded === emp.id && (
                  <tr>
                    <Td colSpan={6} className="!p-4">
                      <p className="mb-2 text-sm font-semibold text-slate-700">أسابيع الشهر</p>
                      <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {[0, 1, 2, 3].map((i) => (
                          <WeekBlock
                            key={i}
                            weekNum={i + 1}
                            weeklySalary={emp.weeklySalary}
                            data={weekData[emp.id]?.[i] || emptyWeek()}
                            onChange={(patch) => updateWeek(emp.id, i, patch)}
                          />
                        ))}
                      </div>

                      <p className="mb-2 text-sm font-semibold text-slate-700">
                        مدفوعات {emp.name}
                      </p>
                      {empPayments.length === 0 ? (
                        <p className="mb-2 text-sm text-slate-400">لا توجد مدفوعات مسجّلة</p>
                      ) : (
                        <div className="mb-3 overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b text-slate-500">
                                <th className="py-1 text-right">التاريخ</th>
                                <th className="py-1 text-right">المبلغ</th>
                                <th className="py-1 text-right">فاتورة</th>
                                <th className="py-1 text-right">الرتب</th>
                                <th className="py-1 text-right">ملاحظات</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {empPayments.map((p) => (
                                <tr key={p.id} className="border-b border-slate-100">
                                  <td className="py-1">{p.paymentDate}</td>
                                  <td className="py-1">{formatMoney(p.amount)}</td>
                                  <td className="py-1">{p.invoiceNumber || "—"}</td>
                                  <td className="py-1">{p.rankReceived || "—"}</td>
                                  <td className="py-1">{p.notes || "—"}</td>
                                  <td className="py-1">
                                    <Button
                                      variant="danger"
                                      className="!px-2 !py-1 text-xs"
                                      onClick={() => deletePayment(p.id)}
                                    >
                                      حذف
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </Td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </Table>

      {generalPayments.length > 0 && (
        <Card className="mt-6">
          <h2 className="mb-3 font-semibold">مدفوعات عامة (بدون موظف)</h2>
          <Table>
            <thead>
              <tr>
                <Th>التاريخ</Th>
                <Th>المبلغ</Th>
                <Th>فاتورة</Th>
                <Th>الرتب</Th>
                <Th>ملاحظات</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {generalPayments.map((p) => (
                <tr key={p.id}>
                  <Td>{p.paymentDate}</Td>
                  <Td>{formatMoney(p.amount)}</Td>
                  <Td>{p.invoiceNumber || "—"}</Td>
                  <Td>{p.rankReceived || "—"}</Td>
                  <Td>{p.notes || "—"}</Td>
                  <Td>
                    <Button variant="danger" onClick={() => deletePayment(p.id)}>
                      حذف
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <Modal
        open={paymentModal.open}
        onClose={() => setPaymentModal({ open: false, employeeId: "" })}
        title={
          paymentModal.employeeId
            ? `دفعة — ${employees.find((e) => e.id === paymentModal.employeeId)?.name ?? ""}`
            : "دفعة عامة"
        }
      >
        <PaymentForm
          form={paymentForm}
          setForm={setPaymentForm}
          onSubmit={submitPayment}
          submitLabel="تسجيل الدفعة"
        />
      </Modal>
    </div>
  );
}
