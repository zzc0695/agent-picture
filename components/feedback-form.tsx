"use client";
import { useState } from "react";
import { feedbackCategories } from "@/lib/feedback";
export function FeedbackForm({ planId }: { planId: string }) {
 const [category, setCategory] = useState("quality");
 const [message, setMessage] = useState("");
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState("");
 const [sent, setSent] = useState(false);
 async function submit(event: React.FormEvent) {
  event.preventDefault(); setBusy(true); setError("");
  try {
   const response = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId, category, message }) });
   const data = await response.json();
   if (!response.ok) throw new Error(data.error || "提交失败，请稍后重试");
   setSent(true); setMessage("");
  } catch (e) { setError(e instanceof Error ? e.message : "提交失败，请稍后重试"); }
  finally { setBusy(false); }
 }
 return <section className="studio-card p-6"><h2 className="font-semibold">反馈问题</h2><p className="mt-2 text-sm text-stone-500">效果不符合预期或操作遇到困难？描述问题，我们会结合此方案排查。</p>{sent ? <p role="status" className="mt-4 text-sm text-sage">反馈已提交，感谢帮助我们改进。</p> : <form onSubmit={submit} className="mt-4 space-y-4"><label className="block text-sm">问题类型<select className="mt-2 block w-full rounded-xl border p-3" value={category} onChange={e => setCategory(e.target.value)} disabled={busy}>{Object.entries(feedbackCategories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="block text-sm">问题描述<textarea className="mt-2 block min-h-28 w-full rounded-xl border p-3" value={message} onChange={e => setMessage(e.target.value)} minLength={5} maxLength={2000} required disabled={busy} placeholder="例如：生成后窗户位置变了，希望保留原房间布局。" /></label>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={busy} className="rounded-xl bg-sage px-5 py-3 text-sm text-white disabled:opacity-50">{busy ? "提交中…" : "提交反馈"}</button></form>}</section>;
}
