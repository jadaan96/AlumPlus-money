import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { PeriodProvider } from "./context/PeriodContext";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import PeriodsPage from "./pages/PeriodsPage";
import WorkshopsPage from "./pages/WorkshopsPage";
import ExpensesPage from "./pages/ExpensesPage";
import SalariesPage from "./pages/SalariesPage";
import EmployeesPage from "./pages/EmployeesPage";
import ImportPage from "./pages/ImportPage";
import FinancialReportPage from "./pages/FinancialReportPage";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">جاري التحميل...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <PeriodProvider>
              <Layout />
            </PeriodProvider>
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="reports" element={<FinancialReportPage />} />
        <Route path="periods" element={<PeriodsPage />} />
        <Route path="workshops" element={<WorkshopsPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="salaries" element={<SalariesPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="payments" element={<Navigate to="/salaries" replace />} />
        <Route path="import" element={<ImportPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
