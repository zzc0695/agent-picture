import { Activity, AlertCircle } from "lucide-react";
import Link from "next/link";
import { requirePageMerchantSession } from "@/lib/auth/require-session";
import { db } from "@/lib/db";

export default async function RecordsPage() {
  const session = await requirePageMerchantSession();
  const records = await db.generationRecord.findMany({
    where: { merchantId: session.merchantId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="studio-page studio-library-page records-page">
      <PageHeader
        eyebrow="GENERATION HISTORY"
        title="生成记录"
        description="查看图片识别、提示词润色、效果图和营销文案的调用记录。"
      />
      {records.length ? (
        <div className="grid gap-4">
          {records.map((record) => (
            <article key={record.id} className="studio-card p-5">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="hidden size-12 flex-shrink-0 place-items-center rounded-2xl bg-sage text-white shadow-lg shadow-sage/20 sm:grid">
                  <Activity size={20} strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-serif text-[18px] font-medium text-stone-800">
                      {({ image_generation: "效果图", material_analysis: "图片识别", prompt_optimization: "要求润色", marketing_copy: "营销文案" } as Record<string, string>)[record.type] ?? record.type}
                    </h2>
                    <span className="rounded-full bg-white/65 px-3 py-1 text-[11px] font-medium text-stone-500 shadow-sm">
                      {({ submitting: "提交中", running: "生成中", succeeded: "成功", failed: "失败" } as Record<string, string>)[record.status] ?? record.status} · 成功计数 {record.usageUnits}
                    </span>
                  </div>
                  <p className="mt-3 break-words text-[13px] leading-7 text-stone-600">
                    {record.inputSummary}
                  </p>
                  {record.timings && typeof record.timings === "object" && !Array.isArray(record.timings) && typeof record.timings.totalMs === "number" ? (
                    <p className="mt-2 text-xs text-stone-500">总耗时 {(record.timings.totalMs / 1000).toFixed(1)} 秒</p>
                  ) : null}
                  {record.status === "running" ? <Link href="/" className="mt-2 inline-block text-sm text-sage underline">返回工作台查看进度</Link> : null}
                  {record.type === "image_generation" && record.status === "succeeded" && record.resultImageUrl ? <div className="mt-3 flex gap-4 text-sm"><Link href={`/?jobId=${record.id}`} className="text-sage underline">找回效果图 / 继续制作</Link><a href={`/api/files/download?url=${encodeURIComponent(record.resultImageUrl)}`} className="text-sage underline">下载效果图</a></div> : null}
                  {record.failureReason ? (
                    <p className="mt-3 flex items-start gap-2 rounded-2xl bg-red-50 px-3 py-2 text-[13px] leading-6 text-red-700">
                      <AlertCircle size={15} className="mt-1 flex-shrink-0" />
                      {record.failureReason}
                    </p>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="还没有记录" body="生成图片和文案后会产生记录。" />
      )}
    </div>
  );
}

function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-8 px-1">
      <p className="text-[11px] font-medium tracking-widest text-sage">
        {eyebrow}
      </p>
      <h1 className="mt-2 font-serif text-[30px] font-medium text-stone-800">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-[14px] leading-7 text-stone-500">
        {description}
      </p>
    </header>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <section className="studio-card grid min-h-52 place-items-center p-8 text-center">
      <div>
        <h2 className="font-serif text-[20px] font-medium text-stone-800">
          {title}
        </h2>
        <p className="mt-3 text-[13px] leading-6 text-stone-500">{body}</p>
      </div>
    </section>
  );
}
