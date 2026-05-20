import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button, Input, Label, Card, Alert } from "@/components/ui";

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    navigate("/");
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <h1 className="mb-2 text-center text-2xl font-bold text-slate-900">نظام حسابات الورش</h1>
        <p className="mb-6 text-center text-sm text-slate-500">سجّل الدخول للمتابعة</p>
        {error && <div className="mb-4"><Alert message={error} /></div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>اسم المستخدم</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
          </div>
          <div>
            <Label>كلمة المرور</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "جاري الدخول..." : "دخول"}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-400">افتراضي: admin / admin123</p>
      </Card>
    </div>
  );
}
