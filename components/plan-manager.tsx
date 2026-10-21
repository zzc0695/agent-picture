"use client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Plan = { id: string; customerId: string | null; customerName: string; notes: string; status: string; shortVideoScript: string | null; socialCopy: string | null; customerScript: string | null; shareToken: string | null; shareExpiresAt: string | null; primaryImageUrl: string | null };

export function PlanManager({ plan, customers }: { plan: Plan; customers: { id: string; name: string }[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ customerId: plan.customerId ?? "", customerName: plan.customerName, notes: plan.notes, status: plan.status, shortVideoScript: plan.shortVideoScript ?? "", socialCopy: plan.socialCopy ?? "", customerScript: plan.customerScript ?? "" });
  const activeShare = plan.shareToken && plan.shareExpiresAt && new Date(plan.shareExpiresAt) > new Date();
  const [share, setShare] = useState(activeShare ? { path: `/share/${plan.shareToken}`, expiresAt: plan.shareExpiresAt! } : null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  async function run(action: () => Promise<void>) {
    setBusy(true); setError(""); setNotice("");
    try { await action(); } catch (reason) { setError(reason instanceof Error ? reason.message : "操作失败，请重试"); } finally { setBusy(false); }
  }
  async function request(path: string, method: string, body?: unknown) {
    const response = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "操作失败");
    return result;
  }
  const base = `/api/plans/${plan.id}`;
  const field = "mt-2 w-full rounded-xl border border-stone-200 bg-white p-3 text-sm";
  return <section className="studio-card space-y-5 p-6">
    <h2 className="font-semibold">管理与交付</h2>
    <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void run(async () => { await request(base, "PATCH", { ...form, customerId: form.customerId || null }); setNotice("方案已更新"); router.refresh(); }); }}>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm">关联客户<select className={field} value={form.customerId} onChange={(event) => { const id = event.target.value; setForm({ ...form, customerId: id, customerName: customers.find(customer => customer.id === id)?.name ?? form.customerName }); }}><option value="">仅填写称呼</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
        <label className="text-sm">客户称呼<Input className={field} value={form.customerName} required maxLength={80} disabled={Boolean(form.customerId)} onChange={(event) => setForm({ ...form, customerName: event.target.value })} /></label>
        <label className="text-sm">状态<select className={field} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="draft">草稿</option><option value="ready">已生成</option><option value="delivered">已交付</option></select></label>
      </div>
      <label className="block text-sm">房间 / 内部备注<Input className={field} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
      <details><summary className="cursor-pointer text-sm text-sage">修改文案与客户方案说明</summary><div className="mt-4 space-y-4">{([['shortVideoScript', '短视频脚本'], ['socialCopy', '社交分享文案'], ['customerScript', '客户方案说明（交付页可见）']] as const).map(([key, label]) => <label key={key} className="block text-sm">{label}<Textarea className={field} rows={5} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>)}</div></details>
      <Button type="submit" disabled={busy}>保存修改</Button>
    </form>
    <div className="space-y-3 border-t border-stone-200 pt-5">
      <p className="text-sm text-stone-500">客户无需登录即可查看。链接有效 7 天，撤销后立即失效。修改方案后交付页同步更新；请先保存修改。</p>
      <div className="flex flex-wrap gap-3">
        <Button disabled={busy || !plan.primaryImageUrl} className="rounded-xl border border-stone-200 px-4 py-2 text-sm disabled:opacity-50" onClick={() => void run(async () => { setShare(await request(`${base}/share`, "POST")); setNotice("交付链接已就绪"); })}>{share ? "查看交付链接" : "创建交付链接"}</Button>
        {share && <><a className="rounded-xl border border-stone-200 px-4 py-2 text-sm text-sage" href={share.path} target="_blank" rel="noreferrer">预览 / 打印 PDF</a><Button disabled={busy} className="rounded-xl border border-stone-200 px-4 py-2 text-sm" onClick={() => void run(async () => { await navigator.clipboard.writeText(`${window.location.origin}${share.path}`); setNotice("交付链接已复制"); })}>复制链接</Button><Button disabled={busy} className="px-3 text-sm text-stone-500" onClick={() => void run(async () => { await request(`${base}/share`, "DELETE"); setShare(null); setNotice("交付链接已撤销"); router.refresh(); })}>撤销分享</Button></>}
      </div>
      {share && <p className="break-all text-xs text-stone-500">{share.path} · 到期：{new Date(share.expiresAt).toLocaleString("zh-CN")}</p>}
    </div>
    {notice && <p role="status" className="text-sm text-sage">{notice}</p>}{error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <Button disabled={busy} className="text-sm text-red-600" onClick={() => { if (window.confirm("删除这个方案？关联的分享链接也会失效。")) void run(async () => { await request(base, "DELETE"); router.push("/plans"); router.refresh(); }); }}>删除方案</Button>
  </section>;
}
