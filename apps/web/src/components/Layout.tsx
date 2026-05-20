import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { usePeriod } from "@/context/PeriodContext";
import { Button, Select } from "./ui";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatPeriod } from "@/lib/format";
import {
  LayoutDashboard,
  FileBarChart,
  Calendar,
  Wrench,
  Receipt,
  Users,
  Banknote,
  Upload,
  LogOut,
} from "lucide-react";
import clsx from "clsx";

interface PeriodItem {
  id: string;
  year: number;
  month: number;
  label: string;
}

const nav = [
  { to: "/", label: "لوحة التحكم", icon: LayoutDashboard },
  { to: "/reports", label: "التقرير المالي", icon: FileBarChart },
  { to: "/periods", label: "الفترات", icon: Calendar },
  { to: "/workshops", label: "الورش", icon: Wrench },
  { to: "/expenses", label: "المصروفات", icon: Receipt },
  { to: "/salaries", label: "الرواتب والمدفوعات", icon: Banknote },
  { to: "/employees", label: "الموظفون", icon: Users },
  { to: "/import", label: "استيراد Excel", icon: Upload },
];

export default function Layout() {
  const { logout, user } = useAuth();
  const { periodId, setPeriodId } = usePeriod();
  const [periods, setPeriods] = useState<PeriodItem[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    api<PeriodItem[]>("/api/periods")
      .then((data) => {
        setPeriods(data);
        if (!periodId && data.length > 0) setPeriodId(data[0].id);
      })
      .catch(console.error);
  }, [periodId, setPeriodId]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col border-l border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <h1 className="text-lg font-bold text-primary-700">حسابات الورش</h1>
          <p className="text-xs text-slate-500">{user?.username}</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
                  isActive
                    ? "bg-primary-50 font-medium text-primary-700"
                    : "text-slate-600 hover:bg-slate-50"
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
            <LogOut size={18} />
            تسجيل الخروج
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="text-sm text-slate-600">الفترة الحالية:</span>
          <Select
            className="max-w-xs"
            value={periodId || ""}
            onChange={(e) => setPeriodId(e.target.value || null)}
          >
            <option value="">— اختر فترة —</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label || formatPeriod(p.year, p.month)}
              </option>
            ))}
          </Select>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
