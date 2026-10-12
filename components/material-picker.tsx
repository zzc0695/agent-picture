"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
type Material = { id: string; name: string; imageUrl: string };
export function MaterialPicker({ disabled, styleImageUrl, detailImageUrl, onSelect }: { disabled: boolean; styleImageUrl: string; detailImageUrl: string; onSelect: (id: string, url: string, role: "style" | "detail") => void }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { let stopped = false; void fetch("/api/materials").then(async response => { if (!response.ok) throw new Error("素材库读取失败，请刷新重试"); return response.json(); }).then(result => { if (!stopped) setMaterials(result.materials); }).catch(reason => { if (!stopped) setError(reason.message); }); return () => { stopped = true; }; }, []);
  return <section className="mb-6 space-y-3 rounded-xl border border-stone-200 bg-white/60 p-3"><h2 className="text-sm font-medium">从我的素材库选择</h2>
    {([['style', '整体款式'], ['detail', '面料细节']] as const).map(([role, label]) => <label key={role} className="block text-xs text-stone-600">{label}<select aria-label={`素材库${label}`} disabled={disabled} value={materials.find(material => material.imageUrl === (role === "style" ? styleImageUrl : detailImageUrl))?.id || ""} onChange={event => { const material = materials.find(item => item.id === event.target.value); if (material) onSelect(material.id, material.imageUrl, role); }} className="mt-2 w-full rounded-lg border border-stone-200 bg-white p-2"><option value="" disabled>选择已保存素材</option>{materials.map(material => <option key={material.id} value={material.id}>{material.name}</option>)}</select></label>)}
    {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    <Link href="/materials" className="inline-block text-xs text-sage underline">添加 / 管理我的素材</Link>
  </section>;
}
