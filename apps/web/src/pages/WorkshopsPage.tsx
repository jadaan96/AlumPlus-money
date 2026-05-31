import { useEffect, useState, FormEvent, useRef } from "react";
import { api, getAccessToken } from "@/lib/api";
import { usePeriod } from "@/context/PeriodContext";
import { formatMoney } from "@/lib/format";
import { WORKSHOP_STATUSES, WORKSHOP_STATUS_LABELS, WorkshopStatus } from "@workshop/shared";
import {
  PageHeader,
  Button,
  Table,
  Th,
  Td,
  Input,
  Label,
  Select,
  Modal,
} from "@/components/ui";

interface Workshop {
  id: string;
  name: string;
  totalAmount: number;
  receivedAmount: number;
  remainingAmount: number;
  location: string | null;
  status: WorkshopStatus;
  sectionType: string | null;
  source: string | null;
  phone: string | null;
  notes: string | null;
  deliveryDate: string | null;
  receivedDate: string | null;
}

const emptyForm = {
  name: "",
  totalAmount: 0,
  receivedAmount: 0,
  location: "",
  status: "COLLECTING" as WorkshopStatus,
  sectionType: "",
  source: "",
  phone: "",
  notes: "",
  deliveryDate: "",
  receivedDate: "",
};

export default function WorkshopsPage() {
  const { periodId } = usePeriod();
  const [items, setItems] = useState<Workshop[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Workshop | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState<{ imported: number; errors: string[] } | null>(
    null
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    if (!periodId) return;
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    if (statusFilter) q.set("status", statusFilter);
    api<Workshop[]>(`/api/workshops/period/${periodId}?${q}`)
      .then(setItems)
      .catch(console.error);
  };

  useEffect(load, [periodId, search, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (w: Workshop) => {
    setEditing(w);
    setForm({
      name: w.name,
      totalAmount: w.totalAmount,
      receivedAmount: w.receivedAmount,
      location: w.location || "",
      status: w.status,
      sectionType: w.sectionType || "",
      source: w.source || "",
      phone: w.phone || "",
      notes: w.notes || "",
      deliveryDate: w.deliveryDate || "",
      receivedDate: w.receivedDate || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!periodId) return;
    const body = { ...form, periodId };
    if (editing) {
      await api(`/api/workshops/${editing.id}`, { method: "PUT", body: JSON.stringify(body) });
    } else {
      await api("/api/workshops", { method: "POST", body: JSON.stringify(body) });
    }
    setModalOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف هذه الورشة؟")) return;
    await api(`/api/workshops/${id}`, { method: "DELETE" });
    load();
  };

  const exportCsv = async () => {
    if (!periodId) return;
    const csv = await api<string>(`/api/workshops/period/${periodId}/export`);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workshops-${periodId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCsv = async (e: FormEvent) => {
    e.preventDefault();
    if (!periodId || !fileRef.current?.files?.[0]) return;
    setImporting(true);
    setImportReport(null);
    try {
      const fd = new FormData();
      fd.append("file", fileRef.current.files[0]);
      const res = await fetch(`/api/workshops/period/${periodId}/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        credentials: "include",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الاستيراد");
      setImportReport({ imported: data.imported, errors: data.errors || [] });
      fileRef.current.value = "";
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "فشل الاستيراد");
    } finally {
      setImporting(false);
    }
  };

  if (!periodId) return <p className="text-slate-500">اختر فترة أولاً</p>;

  return (
    <div>
      <PageHeader title="الورش">
        <Button onClick={openCreate}>إضافة ورشة</Button>
        <Button variant="secondary" onClick={exportCsv}>تصدير CSV</Button>
      </PageHeader>

      <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="mb-2 text-sm font-medium text-slate-700">استيراد من CSV</p>
        <p className="mb-3 text-xs text-slate-500">
          استخدم ملف CSV بأعمدة: الاسم، الإجمالي، المستلم، المتبقي، الحالة، المكان، نوع المقطع،
          المصدر، الهاتف، تاريخ التسليم، تاريخ الاستلام، ملاحظات
        </p>
        <form onSubmit={importCsv} className="flex flex-wrap items-end gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="text-sm"
            required
          />
          <Button type="submit" variant="secondary" disabled={importing}>
            {importing ? "جاري الاستيراد..." : "استيراد CSV"}
          </Button>
        </form>
        {importReport && (
          <p className="mt-2 text-sm text-green-700">
            تم استيراد {importReport.imported} ورشة
            {importReport.errors.length > 0 && (
              <span className="text-amber-600"> — {importReport.errors.length} تحذير</span>
            )}
          </p>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="بحث بالاسم..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="max-w-xs">
          <option value="">كل الحالات</option>
          {WORKSHOP_STATUSES.map((s) => (
            <option key={s} value={s}>{WORKSHOP_STATUS_LABELS[s]}</option>
          ))}
        </Select>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>الاسم</Th>
            <Th>الإجمالي</Th>
            <Th>المستلم</Th>
            <Th>المتبقي</Th>
            <Th>الحالة</Th>
            <Th>الهاتف</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {items.map((w) => (
            <tr key={w.id}>
              <Td className="font-medium">{w.name}</Td>
              <Td>{formatMoney(w.totalAmount)}</Td>
              <Td>{formatMoney(w.receivedAmount)}</Td>
              <Td className="text-amber-600">{formatMoney(w.remainingAmount)}</Td>
              <Td>{WORKSHOP_STATUS_LABELS[w.status]}</Td>
              <Td>{w.phone || "—"}</Td>
              <Td>
                <div className="flex gap-1">
                  <Button variant="ghost" onClick={() => openEdit(w)}>تعديل</Button>
                  <Button variant="danger" onClick={() => handleDelete(w.id)}>حذف</Button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "تعديل ورشة" : "ورشة جديدة"}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div><Label>اسم الورشة *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>الإجمالي</Label><Input type="number" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: +e.target.value })} /></div>
            <div><Label>المستلم</Label><Input type="number" value={form.receivedAmount} onChange={(e) => setForm({ ...form, receivedAmount: +e.target.value })} /></div>
          </div>
          <div><Label>المكان</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
          <div><Label>الحالة</Label>
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as WorkshopStatus })}>
              {WORKSHOP_STATUSES.map((s) => <option key={s} value={s}>{WORKSHOP_STATUS_LABELS[s]}</option>)}
            </Select>
          </div>
          <div><Label>نوع المقطع</Label><Input value={form.sectionType} onChange={(e) => setForm({ ...form, sectionType: e.target.value })} /></div>
          <div><Label>المصدر</Label><Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></div>
          <div><Label>الهاتف</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>ملاحظات</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>إلغاء</Button>
            <Button type="submit">حفظ</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
