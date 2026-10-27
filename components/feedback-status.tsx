"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { feedbackStatuses } from "@/lib/feedback";
export function FeedbackStatus({ id, status }: { id: string; status: string }) {
 const router = useRouter(); const [value, setValue] = useState(status); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [saved, setSaved] = useState(false);
 async function save() {
  setBusy(true); setError(""); setSaved(false);
  try { const r = await fetch("/api/admin/feedback", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: value }) }); const data = await r.json(); if (!r.ok) throw new Error(data.error || "保存失败"); setSaved(true); router.refresh(); }
  catch (e) { setError(e instanceof Error ? e.message : "保存失败"); } finally { setBusy(false); }
 }
 return <div className="mt-4 flex flex-wrap items-center gap-3"><select aria-label="处理状态" className="rounded border p-2" value={value} disabled={busy} onChange={e => { setValue(e.target.value); setSaved(false); }}>{Object.entries(feedbackStatuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><button disabled={busy} onClick={save} className="rounded bg-sage px-4 py-2 text-sm text-white">{busy ? "保存中…" : "保存状态"}</button>{saved && <span role="status">已保存</span>}{error && <span role="alert" className="text-red-700">{error}</span>}</div>;
}
