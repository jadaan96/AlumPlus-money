import { useEffect, useState, FormEvent } from "react";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { PageHeader, Button, Table, Th, Td, Input, Label, Modal } from "@/components/ui";

interface Employee {
  id: string;
  name: string;
  active: boolean;
  weeklySalary: number;
}

export default function EmployeesPage() {
  const [items, setItems] = useState<Employee[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [name, setName] = useState("");
  const [weeklySalary, setWeeklySalary] = useState(0);
  const [active, setActive] = useState(true);

  const load = () => api<Employee[]>("/api/employees").then(setItems);

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setWeeklySalary(0);
    setActive(true);
    setModalOpen(true);
  };

  const openEdit = (e: Employee) => {
    setEditing(e);
    setName(e.name);
    setWeeklySalary(e.weeklySalary ?? 0);
    setActive(e.active);
    setModalOpen(true);
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    const body = { name, active, weeklySalary };
    if (editing) {
      await api(`/api/employees/${editing.id}`, { method: "PUT", body: JSON.stringify(body) });
    } else {
      await api("/api/employees", { method: "POST", body: JSON.stringify(body) });
    }
    setModalOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف الموظف؟")) return;
    await api(`/api/employees/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div>
      <PageHeader title="الموظفون">
        <Button onClick={openCreate}>إضافة موظف</Button>
      </PageHeader>

      <Table>
        <thead>
          <tr>
            <Th>الاسم</Th>
            <Th>الراتب الأسبوعي</Th>
            <Th>الحالة</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {items.map((e) => (
            <tr key={e.id}>
              <Td>{e.name}</Td>
              <Td>{formatMoney(e.weeklySalary ?? 0)}</Td>
              <Td>{e.active ? "نشط" : "غير نشط"}</Td>
              <Td>
                <Button variant="ghost" onClick={() => openEdit(e)}>تعديل</Button>
                <Button variant="danger" onClick={() => handleDelete(e.id)}>حذف</Button>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "تعديل موظف" : "موظف جديد"}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>الاسم</Label>
            <Input value={name} onChange={(ev) => setName(ev.target.value)} required />
          </div>
          <div>
            <Label>الراتب الأسبوعي (أساسي)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={weeklySalary}
              onChange={(ev) => setWeeklySalary(+ev.target.value)}
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              يُستخدم لحساب سعر الساعة والإضافي (أسبوع 54 ساعة اعتيادية)
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(ev) => setActive(ev.target.checked)} />
            نشط
          </label>
          <Button type="submit">حفظ</Button>
        </form>
      </Modal>
    </div>
  );
}
