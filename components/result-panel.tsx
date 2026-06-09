"use client";

/* eslint-disable @next/next/no-img-element */

export function ResultPanel({
  imageUrl,
  shortVideoScript,
  socialCopy,
  customerScript,
  onSimilar,
  onMarketing,
  onSave,
  onCompare,
}: {
  imageUrl: string;
  shortVideoScript: string;
  socialCopy: string;
  customerScript: string;
  onSimilar: () => void;
  onMarketing: () => void;
  onSave: () => void;
  onCompare?: () => void;
}) {
  if (!imageUrl) return null;

  return (
    <section className="space-y-4 rounded-[10px] border border-neutral-200 bg-white p-4 shadow-[0_12px_34px_rgba(31,41,55,0.08)]">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">生成结果</h2>
        <button
          type="button"
          className="text-sm font-medium text-[#1e6d67]"
          onClick={onSimilar}
        >
          重新生成
        </button>
      </div>
      <div className="relative overflow-hidden rounded-[10px] bg-neutral-100">
        <span className="absolute left-3 top-3 rounded-md bg-[#d86f4b] px-2 py-1 text-xs font-medium text-white">
          最新生成
        </span>
        <img
          alt="生成效果图"
          src={imageUrl}
          className="aspect-[4/5] w-full object-cover sm:aspect-[4/3]"
        />
        <span className="absolute bottom-3 left-3 rounded-md bg-black/45 px-2 py-1 text-xs text-white">
          1/2
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="rounded-lg bg-[#267a72] px-3 py-3 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(38,122,114,0.2)]"
          onClick={onSave}
        >
          保存高清图
        </button>
        <button
          type="button"
          className="rounded-lg border border-[#2b8178] bg-white px-3 py-3 text-sm font-semibold text-[#1e6d67]"
          onClick={onCompare}
        >
          生成前后对比图
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <button
          type="button"
          className="rounded-lg border border-neutral-200 px-3 py-3 text-neutral-700"
          onClick={onSimilar}
        >
          相似方案
        </button>
        <button
          type="button"
          className="rounded-lg border border-neutral-200 px-3 py-3 text-neutral-700"
          onClick={onMarketing}
        >
          营销内容
        </button>
        <button
          type="button"
          className="rounded-lg border border-neutral-200 px-3 py-3 text-neutral-700"
          onClick={onSave}
        >
          保存方案
        </button>
      </div>
      <div className="rounded-[10px] border border-neutral-200 p-4">
        <h3 className="mb-2 text-sm font-semibold">本次生成条件</h3>
        <ul className="space-y-2 text-sm text-neutral-600">
          <li>✓ 房间结构：已保留</li>
          <li>✓ 样本色彩：平衡处理</li>
          <li>✓ 还原度：平衡模式</li>
        </ul>
      </div>
      {shortVideoScript ? (
        <pre className="whitespace-pre-wrap rounded bg-neutral-50 p-3 text-sm">
          {shortVideoScript}
        </pre>
      ) : null}
      {socialCopy ? (
        <pre className="whitespace-pre-wrap rounded bg-neutral-50 p-3 text-sm">
          {socialCopy}
        </pre>
      ) : null}
      {customerScript ? (
        <pre className="whitespace-pre-wrap rounded bg-neutral-50 p-3 text-sm">
          {customerScript}
        </pre>
      ) : null}
    </section>
  );
}
