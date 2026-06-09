"use client";

export function ResultPanel({
  imageUrl,
  shortVideoScript,
  socialCopy,
  customerScript,
  onSimilar,
  onMarketing,
  onSave,
}: {
  imageUrl: string;
  shortVideoScript: string;
  socialCopy: string;
  customerScript: string;
  onSimilar: () => void;
  onMarketing: () => void;
  onSave: () => void;
}) {
  if (!imageUrl) return null;

  return (
    <section className="space-y-4 rounded-md border bg-white p-4">
      <div className="aspect-[4/3] rounded bg-neutral-100 p-4 text-sm text-neutral-500">
        {imageUrl}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          className="rounded-md border px-3 py-2 text-sm"
          onClick={onSimilar}
        >
          基于当前效果生成相似方案
        </button>
        <button
          type="button"
          className="rounded-md border px-3 py-2 text-sm"
          onClick={onMarketing}
        >
          生成营销内容
        </button>
        <button
          type="button"
          className="rounded-md bg-neutral-950 px-3 py-2 text-sm text-white"
          onClick={onSave}
        >
          保存客户方案
        </button>
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
