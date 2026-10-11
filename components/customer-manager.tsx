"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
type Customer = { id: string; name: string; contact: string; notes: string; _count: { plans: number } };
export function CustomerManager({ customers }: { customers: Customer[] }) {
  const router = useRouter(); const [editing, setEditing] = useState<Customer | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; setBusy(true); setError("");
    try {
      const r = await fetch(editing ? `/api/customers/${editing.id}` : "/api/customers", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      if (!r.ok) throw new Error((await r.json()).error); setEditing(null); form.reset(); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "保存失败"); } finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (!confirm("删除客户档案？已有方案会保留。")) return;
    setBusy(true); setError("");
    try { const r = await fetch(`/api/customers/${id}`, { method: "DELETE" }); if (!r.ok) throw new Error("删除失败"); if (editing?.id === id) setEditing(null); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "删除失败"); } finally { setBusy(false); }
  }
  return <div className="space-y-6"><form key={editing?.id || "new"} onSubmit={save} className="studio-card space-y-3 p-5">
    <h2 className="font-semibold">{editing ? "编辑客户" : "添加客户"}</h2>
    <label className="block text-sm">客户姓名<input name="name" required maxLength={80} defaultValue={editing?.name} className="mt-1 w-full rounded border p-2" /></label>
    <label className="block text-sm">联系方式<input name="contact" maxLength={160} defaultValue={editing?.contact} placeholder="电话或微信（选填）" className="mt-1 w-full rounded border p-2" /></label>
    <label className="block text-sm">备注<textarea name="notes" maxLength={2000} defaultValue={editing?.notes} className="mt-1 w-full rounded border p-2" /></label>
    <button disabled={busy} className="rounded bg-sage px-4 py-2 text-white">{busy ? "处理中..." : "保存客户"}</button>
    {editing && <button type="button" onClick={() => setEditing(null)} className="ml-4 text-sm underline">取消编辑</button>}
  </form>{error && <p role="alert" className="text-red-600">{error}</p>}
  {customers.length ? customers.map(customer => <article key={customer.id} className="studio-card space-y-2 p-5"><h2 className="font-semibold">{customer.name}</h2><p className="text-sm text-stone-500">{customer.contact || "未填写联系方式"}</p><p className="whitespace-pre-wrap text-sm">{customer.notes}</p>
    <div className="flex gap-5 text-sm"><Link className="text-sage underline" href={`/plans?customerId=${customer.id}`}>查看 {customer._count.plans} 个方案</Link><button disabled={busy} onClick={() => setEditing(customer)}>编辑</button><button disabled={busy} onClick={() => remove(customer.id)} className="text-red-600">删除客户</button></div>
  </article>) : <p className="text-stone-500">先添加一个客户，再把方案归到客户名下。</p>}</div>;
}
