"use client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
export function MaterialCreateForm() {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const file = data.get("file") as File;
    if (!file?.size || file.size > 4 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("请选择不超过 4MB 的 JPG、PNG 或 WebP 图片"); return; }
    setBusy(true); setError("");
    try {
      const upload = new FormData(); upload.set("file", file);
      const response = await fetch("/api/files", { method: "POST", body: upload }); const image = await response.json(); if (!response.ok) throw new Error(image.error || "上传失败");
      data.delete("file"); const saved = await fetch("/api/materials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...Object.fromEntries(data), imageUrl: image.url }) });
      if (!saved.ok) throw new Error((await saved.json()).error || "素材保存失败"); form.reset(); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "保存失败，请重试"); } finally { setBusy(false); }
  }
  return <details className="studio-card mb-6 p-5"><summary className="cursor-pointer font-medium">添加我的素材</summary><form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2"><fieldset disabled={busy} className="contents">{([['name','素材名称'],['category','分类（款式 / 面料等）'],['color','颜色'],['fabric','材质'],['priceRange','价格说明（不确定可填待询价）']] as const).map(([name,label]) => <label key={name} className="text-sm">{label}<Input name={name} required maxLength={160} className="mt-2 w-full rounded-lg border border-stone-200 p-3" /></label>)}<label className="text-sm">素材图片<Input name="file" type="file" required accept="image/jpeg,image/png,image/webp" className="mt-2 block w-full text-sm" /></label><label className="text-sm">卖点（选填）<Input name="sellingPoints" className="mt-2 w-full rounded-lg border border-stone-200 p-3" /></label><Button type="submit">{busy ? "保存中..." : "保存到我的素材库"}</Button></fieldset>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}</form></details>;
}
