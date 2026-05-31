import { useEffect, useState, FormEvent } from "react";
import { api } from "@/lib/api";
import { usePeriod } from "@/context/PeriodContext";
import { formatMoney, formatPeriod } from "@/lib/format";
import { PageHeader, Button, Card, Table, Th, Td, Input, Label, Modal } from "@/components/ui";

interface PeriodRow {
  id: string;
  year: number;
  month: number;
  label: string;
  summary: {
    workshopsCount: number;
    workshopsTotal: number;
    workshopsReceived: number;
    workshopsRemaining: number;
    expensesTotal: number;
    salariesTotal: number;
    paymentsTotal: number;
  };
}

export default function PeriodsPage() {
  const { setPeriodId } = usePeriod();
  const [periods, setPeriods] = useState<PeriodRow[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [editModal, setEditModal] = useState<{ open: boolean; period: PeriodRow | null }>({
    open: false,
    period: null,
  });
  const [editYear, setEditYear] = useState(2026);
  const [editMonth, setEditMonth] = useState(1);

  const load = () =>
    api<PeriodRow[]>("/api/periods").then((data) => {
      setPeriods(data);
      window.dispatchEvent(new Event("periods-updated"));
    });

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api("/api/periods", { method: "POST", body: JSON.stringify({ year, month }) });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "تعذر إنشاء الفترة");
    }
  };

  const openEdit = (p: PeriodRow) => {
    setEditYear(p.year);
    setEditMonth(p.month);
    setEditModal({ open: true, period: p });
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!editModal.period) return;
    try {
      await api(`/api/periods/${editModal.period.id}`, {
        method: "PUT",
        body: JSON.stringify({ year: editYear, month: editMonth }),
      });
      setEditModal({ open: false, period: null });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "تعذر تعديل الفترة");
    }
  };

  const handleDelete = async (p: PeriodRow) => {
    if (
      !confirm(
        `حذف فترة ${p.label || formatPeriod(p.year, p.month)}؟\nسيتم حذف كل الورش والمصروفات والرواتب المرتبطة بها.`
      )
    ) {
      return;
    }
    try {
      await api(`/api/periods/${p.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "تعذر الحذف");
    }
  };

  return (
    <div>
      <PageHeader title="الفترات الشهرية" />

      <Card className="mb-6 max-w-md">
        <h2 className="mb-4 font-semibold">إنشاء فترة جديدة</h2>
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
          <div>
            <Label>السنة</Label>
            <Input type="number" value={year} onChange={(e) => setYear(+e.target.value)} />
          </div>
          <div>
            <Label>الشهر</Label>
            <Input
              type="number"
              min={1}
              max={12}
              value={month}
              onChange={(e) => setMonth(+e.target.value)}
            />
          </div>
          <Button type="submit">إنشاء</Button>
        </form>
      </Card>

      <Table>
        <thead>
          <tr>
            <Th>الفترة</Th>
            <Th>عدد الورش</Th>
            <Th>الإجمالي</Th>
            <Th>المستلم</Th>
            <Th>المتبقي</Th>
            <Th>مصروفات</Th>
            <Th>رواتب</Th>
            <Th>مدفوعات</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {periods.map((p) => (
            <tr key={p.id}>
              <Td className="font-medium">{p.label || formatPeriod(p.year, p.month)}</Td>
              <Td>{p.summary.workshopsCount}</Td>
              <Td>{formatMoney(p.summary.workshopsTotal)}</Td>
              <Td>{formatMoney(p.summary.workshopsReceived)}</Td>
              <Td>{formatMoney(p.summary.workshopsRemaining)}</Td>
              <Td>{formatMoney(p.summary.expensesTotal)}</Td>
              <Td>{formatMoney(p.summary.salariesTotal)}</Td>
              <Td>{formatMoney(p.summary.paymentsTotal)}</Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  <Button variant="secondary" onClick={() => setPeriodId(p.id)}>
                    اختيار
                  </Button>
                  <Button variant="ghost" onClick={() => openEdit(p)}>
                    تعديل
                  </Button>
                  <Button variant="danger" onClick={() => handleDelete(p)}>
                    حذف
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal
        open={editModal.open}
        onClose={() => setEditModal({ open: false, period: null })}
        title={`تعديل الفترة — ${editModal.period?.label ?? ""}`}
      >
        <form onSubmit={handleUpdate} className="space-y-3">
          <p className="text-xs text-slate-500">
            تغيير السنة/الشهر لا يحذف البيانات — فقط يعيد تسمية الفترة.
          </p>
          <div className="flex flex-wrap gap-3">
            <div>
              <Label>السنة</Label>
              <Input
                type="number"
                min={2000}
                max={2100}
                value={editYear}
                onChange={(e) => setEditYear(+e.target.value)}
                required
              />
            </div>
            <div>
              <Label>الشهر</Label>
              <Input
                type="number"
                min={1}
                max={12}
                value={editMonth}
                onChange={(e) => setEditMonth(+e.target.value)}
                required
              />
            </div>
          </div>
          <Button type="submit">حفظ التعديل</Button>
        </form>
      </Modal>
    </div>
  );
}
