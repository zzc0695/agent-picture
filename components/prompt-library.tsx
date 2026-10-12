"use client";

import { useState } from "react";
import { Check, Copy, Search, BookOpenText } from "lucide-react";

type Template = { id: string; title: string; body: string; category: string; isSystem: boolean; description?: string };

export function PromptLibrary({ templates }: { templates: Template[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [copied, setCopied] = useState("");
  const [fallback, setFallback] = useState<Template | null>(null);
  const visible = templates.filter(item => (!category || item.category === category) && `${item.title} ${item.body} ${item.category}`.toLowerCase().includes(query.trim().toLowerCase()));

  async function copy(item: Template) {
    try { await navigator.clipboard.writeText(item.body); setCopied(item.id); setFallback(null); }
    catch { setFallback(item); setCopied(""); }
  }

  return <>
    <div className="library-toolbar">
      <label className="library-search"><Search size={18} aria-hidden="true" /><input aria-label="搜索提示词" placeholder="搜索风格、房间或关键词" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <select aria-label="提示词分类" className="workbench-input" value={category} onChange={event => setCategory(event.target.value)}><option value="">全部分类</option>{[...new Set(templates.map(item => item.category))].filter(Boolean).map(value => <option key={value}>{value}</option>)}</select>
      <p className="text-xs text-stone-500" role="status">{visible.length} 个模板</p>
    </div>
    {fallback && <label className="mb-6 block text-sm text-stone-600">暂时无法自动复制，请选中下方文字复制<textarea aria-label="手动复制提示词" readOnly value={fallback.body} onFocus={event => event.target.select()} className="workbench-input mt-3" rows={4} /></label>}
    {visible.length ? <div className="grid gap-4 lg:grid-cols-2">{visible.map(item => <article key={item.id} className="studio-card prompt-card p-5 sm:p-6">
      <div className="flex items-center gap-3"><BookOpenText size={20} className="text-sage" aria-hidden="true" /><span className="text-xs text-stone-500">{item.isSystem ? "系统模板" : "我的模板"} · {item.category}</span></div>
      <h2 className="mt-4 text-lg font-semibold text-stone-900">{item.title}</h2>
      <p className="mt-3 text-sm leading-7 text-stone-600">{item.description || item.body.slice(0,120)}</p>
      <details className="mt-3 text-sm text-stone-600"><summary className="cursor-pointer py-2 text-sage">查看完整提示词</summary><p className="mt-2 whitespace-pre-wrap leading-7">{item.body}</p></details>
      <button className="studio-secondary-button mt-5 inline-flex items-center justify-center gap-2 px-4" onClick={() => void copy(item)} aria-label={`复制${item.title}`}>{copied === item.id ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}{copied === item.id ? "已复制" : "复制提示词"}</button>
      {copied === item.id && <span role="status" className="ml-3 text-xs text-sage">可粘贴到工作台的生成要求</span>}
    </article>)}</div> : <section className="studio-card p-10 text-center"><h2 className="text-lg font-semibold">{templates.length ? "没有找到匹配模板" : "还没有提示词"}</h2><p className="mt-3 text-sm text-stone-500">{templates.length ? "换个关键词，或清除筛选条件。" : "系统模板和个人模板会显示在这里。"}</p>{templates.length > 0 && <button className="studio-secondary-button mt-5 px-5" onClick={() => { setQuery(""); setCategory(""); }}>清除筛选</button>}</section>}
  </>;
}
