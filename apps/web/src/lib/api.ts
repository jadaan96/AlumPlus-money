const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

let accessToken: string | null = localStorage.getItem("accessToken");

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) localStorage.setItem("accessToken", token);
  else localStorage.removeItem("accessToken");
}

export function getAccessToken() {
  return accessToken;
}

function apiUrl(path: string): string {
  if (path.startsWith("http")) return path;
  const base = API_BASE;
  if (!base) return path;
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

async function refreshAccessToken(): Promise<boolean> {
  const res = await fetch(apiUrl("/api/auth/refresh"), {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) return false;
  const data = await res.json();
  setAccessToken(data.accessToken);
  return true;
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = apiUrl(path);
  const headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string>),
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && !path.includes("/auth/login")) {
    const ok = await refreshAccessToken();
    if (ok) {
      headers.Authorization = `Bearer ${accessToken}`;
      res = await fetch(url, { ...options, headers, credentials: "include" });
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "خطأ في الاتصال" }));
    throw new Error(err.error || "فشل الطلب");
  }

  if (res.status === 204) return undefined as T;
  const ct = res.headers.get("content-type");
  if (ct?.includes("text/csv")) {
    return (await res.text()) as T;
  }
  return res.json();
}
