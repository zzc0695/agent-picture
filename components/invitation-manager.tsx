"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
export type InvitationItem = { id: string; code: string; label: string; maxUses: number; usedCount: number; expiresAt: string; disabled: boolean; dailyImages: number; dailyText: number; concurrentImages: number };
export function InvitationManager({ items, now }: { items: InvitationItem[]; now: number }) {
 const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [link, setLink] = useState("");
 async function create(event: FormEvent<HTMLFormElement>) {
  event.preventDefault(); if (busy) return;
  const form = event.currentTarget; const values = new FormData(form); setBusy(true); setError(""); setMessage("");
  try {
   const body = { label: String(values.get("label")), maxUses: Number(values.get("maxUses")), validDays: Number(values.get("validDays")), dailyImages: Number(values.get("dailyImages")), dailyText: Number(values.get("dailyText")), concurrentImages: Number(values.get("concurrentImages")) };
   const response = await fetch("/api/admin/invitations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
   const data = await response.json(); if (!response.ok) throw new Error(data.error || "创建失败");
   setLink(`${window.location.origin}/register?invite=${data.code}`); setMessage("邀请已创建，可以复制链接发给商家。"); form.reset(); router.refresh();
  } catch(e) { setError(e instanceof Error ? e.message : "创建失败，请重试"); } finally { setBusy(false); }
 }
 async function toggle(item: InvitationItem) {
  setBusy(true); setError(""); setMessage("");
  try { const response = await fetch("/api/admin/invitations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, disabled: !item.disabled }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "保存失败"); setMessage(item.disabled ? "已重新开放邀请" : "已关闭邀请，已注册账号不受影响"); router.refresh(); }
  catch(e) { setError(e instanceof Error ? e.message : "保存失败"); } finally { setBusy(false); }
 }
 async function copy(code?: string) {
  const url = code ? `${window.location.origin}/register?invite=${code}` : link; setLink(url); setError("");
  try { await navigator.clipboard.writeText(url); setMessage("试用链接已复制"); } catch { setMessage("请选中下方链接手动复制"); }
 }
 return <div className="space-y-6"><form onSubmit={create} className="studio-card space-y-4 p-6"><h2 className="font-semibold">创建试用邀请</h2><label className="block text-sm">邀请名称<input name="label" required maxLength={80} disabled={busy} placeholder="例如：第一批窗帘门店" className="mt-2 block w-full rounded border p-3"/></label><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{([{name:"maxUses",label:"可注册人数",value:5,max:1000},{name:"validDays",label:"有效天数",value:14,max:90},{name:"dailyImages",label:"每日生图额度",value:5,max:1000},{name:"dailyText",label:"每日识别与文案额度",value:10,max:1000},{name:"concurrentImages",label:"并发生图任务",value:1,max:10}]).map(field=><label key={field.name} className="text-sm">{field.label}<input name={field.name} type="number" min={1} max={field.max} step={1} defaultValue={field.value} required disabled={busy} className="mt-2 block w-full rounded border p-3"/></label>)}</div><button disabled={busy} className="rounded bg-sage px-4 py-3 text-white">{busy ? "处理中…" : "创建邀请链接"}</button></form>{error && <p role="alert" className="text-red-700">{error}</p>}{message && <p role="status">{message}</p>}{link && <div className="studio-card flex flex-wrap gap-3 p-4"><input aria-label="试用链接" className="min-w-0 flex-1 rounded border p-2" readOnly value={link} onFocus={e=>e.target.select()}/><button onClick={()=>void copy()}>复制链接</button></div>}{!items.length && <p>暂无邀请码，先创建一条试用邀请。</p>}{items.map(item=><article key={item.id} className="studio-card space-y-3 p-6"><h2 className="font-semibold">{item.label} · {item.disabled ? "已关闭" : new Date(item.expiresAt).getTime() <= now ? "已过期" : item.usedCount >= item.maxUses ? "名额已满" : "可使用"}</h2><p className="text-sm">已注册 {item.usedCount} / {item.maxUses} 人 · 到期：{new Date(item.expiresAt).toLocaleString("zh-CN",{timeZone:"Asia/Shanghai"})}</p><p className="text-sm">新账号每日生图 {item.dailyImages} 次 · 识别与文案 {item.dailyText} 次 · 并发 {item.concurrentImages} 个</p><p className="break-all font-mono text-sm">{item.code}</p><div className="flex gap-4"><button onClick={()=>void copy(item.code)}>复制试用链接</button><button disabled={busy} onClick={()=>void toggle(item)}>{item.disabled ? "重新开放" : "关闭邀请"}</button></div></article>)}</div>;
}
