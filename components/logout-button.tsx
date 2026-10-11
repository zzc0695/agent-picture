"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <div className="flex shrink-0 items-center gap-2"><button className="studio-nav-link" disabled={busy} onClick={async () => {
    setBusy(true); setError("");
    try { const response = await fetch("/api/auth/logout", { method: "POST" }); if (!response.ok) throw new Error(); localStorage.removeItem("image-generation-job"); router.replace("/login"); router.refresh(); }
    catch { setError("退出失败，请重试"); } finally { setBusy(false); }
  }}>{busy ? "退出中…" : "退出登录"}</button>{error && <span role="alert" className="text-xs text-red-600">{error}</span>}</div>;
}
