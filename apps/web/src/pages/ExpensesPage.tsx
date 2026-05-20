import { useEffect, useState, FormEvent, useMemo } from "react";
import { api } from "@/lib/api";
import { usePeriod } from "@/context/PeriodContext";
import { formatMoney } from "@/lib/format";
import { PageHeader, Button, Table, Th, Td, Input, Label, Select, Modal, Card } from "@/components/ui";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ExpenseCategory {
  id: string;
  key: string;
  label: string;
  isBuiltin?: boolean;
  expensesCount?: number;
}

interface Expense {
  id: string;
  amount: number;
  description: string | null;
  expenseDate: string;
  categoryId: string;
  category: ExpenseCategory;
}

interface CategorySummary {
  categoryId: string;
  key: string;
  label: string;
  total: number;
  count: number;
}

const CHART_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
];

export default function ExpensesPage() {
  const { periodId } = usePeriod();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [items, setItems] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [chartData, setChartData] = useState<CategorySummary[]>([]);
  const [chartTotal, setChartTotal] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [form, setForm] = useState({
    categoryKey: "",
    amount: 0,
    description: "",
    expenseDate: new Date().toISOString().slice(0, 10),
  });

  const loadCategories = () =>
    api<ExpenseCategory[]>("/api/expenses/categories").then((cats) => {
      setCategories(cats);
      if (!form.categoryKey && cats.length > 0) {
        setForm((f) => ({ ...f, categoryKey: cats[0].key }));
      }
    });

  const loadExpenses = () => {
    if (!periodId) return;
    const q = categoryFilter ? `?categoryId=${categoryFilter}` : "";
    api<{ items: Expense[]; total: number }>(`/api/expenses/period/${periodId}${q}`).then(
      (d) => {
        setItems(d.items);
        setTotal(d.total);
      }
    );
  };

  const loadChart = () => {
    if (!periodId) return;
    api<{ items: CategorySummary[]; grandTotal: number }>(
      `/api/expenses/period/${periodId}/summary`
    ).then((d) => {
      setChartData(d.items);
      setChartTotal(d.grandTotal);
    });
  };

  const load = async () => {
    await loadCategories();
    loadExpenses();
    loadChart();
  };

  useEffect(() => {
    load().catch(console.error);
  }, [periodId, categoryFilter]);

  const filteredChartData = useMemo(() => {
    if (!categoryFilter) return chartData;
    return chartData.filter((c) => c.categoryId === categoryFilter);
  }, [chartData, categoryFilter]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!periodId || !form.categoryKey) return;
    await api("/api/expenses", {
      method: "POST",
      body: JSON.stringify({ ...form, periodId }),
    });
    setModalOpen(false);
    load();
  };

  const handleAddCategory = async (e: FormEvent) => {
    e.preventDefault();
    const label = newCategoryLabel.trim();
    if (!label) return;
    try {
      const cat = await api<ExpenseCategory>("/api/expenses/categories", {
        method: "POST",
        body: JSON.stringify({ label }),
      });
      setCategories((prev) => {
        const exists = prev.some((c) => c.id === cat.id);
        if (exists) return prev.map((c) => (c.id === cat.id ? { ...c, ...cat } : c));
        return [...prev, cat].sort((a, b) => a.label.localeCompare(b.label, "ar"));
      });
      setNewCategoryLabel("");
      setCategoryModalOpen(false);
      setForm((f) => ({ ...f, categoryKey: cat.key }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "تعذر إضافة الفئة");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("حذف هذه الفئة؟")) return;
    try {
      await api(`/api/expenses/categories/${id}`, { method: "DELETE" });
      if (categoryFilter === id) setCategoryFilter("");
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "تعذر الحذف");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف المصروف؟")) return;
    await api(`/api/expenses/${id}`, { method: "DELETE" });
    load();
  };

  if (!periodId) return <p className="text-slate-500">اختر فترة أولاً</p>;

  return (
    <div>
      <PageHeader title="المصروفات">
        <Button variant="secondary" onClick={() => setCategoryModalOpen(true)}>
          فئة جديدة
        </Button>
        <Button onClick={() => setModalOpen(true)}>إضافة مصروف</Button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px]">
          <Label>فلتر حسب الفئة</Label>
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">كل الفئات</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">توزيع المصروفات (دائري)</h2>
          {filteredChartData.length === 0 ? (
            <p className="text-sm text-slate-500">لا توجد مصروفات لهذه الفترة</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={filteredChartData}
                  dataKey="total"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ label, percent }) =>
                    `${label} (${(percent * 100).toFixed(0)}%)`
                  }
                >
                  {filteredChartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatMoney(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">المصروفات حسب الفئة (أعمدة)</h2>
          {filteredChartData.length === 0 ? (
            <p className="text-sm text-slate-500">لا توجد مصروفات</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={filteredChartData} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => formatMoney(v)} />
                <YAxis type="category" dataKey="label" width={75} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatMoney(v)} />
                <Bar dataKey="total" name="المبلغ" fill="#ef4444" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card className="mb-4">
        <p className="text-sm text-slate-500">
          {categoryFilter ? "مجموع الفئة المحددة" : "المجموع الكلي للفترة"}
        </p>
        <p className="text-2xl font-bold text-red-600">
          {formatMoney(categoryFilter ? total : chartTotal)}
        </p>
      </Card>

      <Card className="mb-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">ملخص الفئات</h2>
        <div className="flex flex-wrap gap-2">
          {chartData.map((c, i) => (
            <button
              key={c.categoryId}
              type="button"
              onClick={() =>
                setCategoryFilter(categoryFilter === c.categoryId ? "" : c.categoryId)
              }
              className={`rounded-full px-3 py-1 text-xs transition ${
                categoryFilter === c.categoryId
                  ? "bg-primary-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              style={{
                borderRight: `3px solid ${CHART_COLORS[i % CHART_COLORS.length]}`,
              }}
            >
              {c.label}: {formatMoney(c.total)} ({c.count})
            </button>
          ))}
        </div>
      </Card>

      <Table>
        <thead>
          <tr>
            <Th>الفئة</Th>
            <Th>البند</Th>
            <Th>المبلغ</Th>
            <Th>التاريخ</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <Td colSpan={5} className="text-center text-slate-400">
                لا توجد مصروفات
              </Td>
            </tr>
          ) : (
            items.map((e) => (
              <tr key={e.id}>
                <Td>{e.category.label}</Td>
                <Td>{e.description || "—"}</Td>
                <Td>{formatMoney(e.amount)}</Td>
                <Td>{e.expenseDate}</Td>
                <Td>
                  <Button variant="danger" onClick={() => handleDelete(e.id)}>
                    حذف
                  </Button>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="مصروف جديد">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>الفئة</Label>
            <Select
              value={form.categoryKey}
              onChange={(ev) => setForm({ ...form, categoryKey: ev.target.value })}
              required
            >
              {categories.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>المبلغ</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.amount}
              onChange={(ev) => setForm({ ...form, amount: +ev.target.value })}
              required
            />
          </div>
          <div>
            <Label>البند / الوصف</Label>
            <Input
              value={form.description}
              onChange={(ev) => setForm({ ...form, description: ev.target.value })}
            />
          </div>
          <div>
            <Label>التاريخ</Label>
            <Input
              type="date"
              value={form.expenseDate}
              onChange={(ev) => setForm({ ...form, expenseDate: ev.target.value })}
            />
          </div>
          <Button type="submit">حفظ</Button>
        </form>
      </Modal>

      <Modal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title="فئة مصروف جديدة"
      >
        <form onSubmit={handleAddCategory} className="space-y-3">
          <div>
            <Label>اسم الفئة</Label>
            <Input
              value={newCategoryLabel}
              onChange={(e) => setNewCategoryLabel(e.target.value)}
              placeholder="مثال: صيانة، كهرباء..."
              required
            />
          </div>
          <Button type="submit">إضافة الفئة</Button>
        </form>
        {categories.length > 0 && (
          <div className="mt-4 border-t border-slate-200 pt-3">
            <p className="mb-2 text-xs font-medium text-slate-500">الفئات الحالية</p>
            <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
              {categories.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2">
                  <span>{c.label}</span>
                  {!c.isBuiltin ? (
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:underline"
                      onClick={() => handleDeleteCategory(c.id)}
                    >
                      حذف
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>
    </div>
  );
}
