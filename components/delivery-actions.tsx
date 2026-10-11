"use client";

export function DeliveryActions({ token }: { token: string }) {
  return <div className="flex flex-wrap gap-3 print:hidden">
    <button className="rounded-xl bg-sage px-5 py-3 text-white" onClick={() => window.print()}>打印 / 保存 PDF</button>
    <a className="rounded-xl border border-stone-200 px-5 py-3" href={`/api/share/${token}/download`}>下载效果图</a>
  </div>;
}
