import { Activity, AlertCircle } from "lucide-react";
import { requirePageMerchantSession } from "@/lib/auth/require-session";
import { db } from "@/lib/db";

export default async function RecordsPage() {
  const session = await requirePageMerchantSession();
  const records = await db.generationRecord.findMany({
    where: { merchantId: session.merchantId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="studio-page studio-library-page">
      <PageHeader
        eyebrow="GENERATION HISTORY"
        title="生成记录"
        description="记录仍来自当前后端生成流水，类型、状态和消耗单位不做前端重分类。"
      />
      {records.length ? (
        <div className="grid gap-4">
          {records.map((record) => (
            <article key={record.id} className="studio-card p-5">
              <div className="flex items-start gap-4">
                <div className="grid size-12 flex-shrink-0 place-items-center rounded-2xl bg-sage text-white shadow-lg shadow-sage/20">
                  <Activity size={20} strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-serif text-[18px] font-medium text-stone-800">
                      {record.type}
                    </h2>
                    <span className="rounded-full bg-white/65 px-3 py-1 text-[11px] font-medium text-stone-500 shadow-sm">
                      {record.status} · 消耗 {record.usageUnits}
                    </span>
                  </div>
                  <p className="mt-3 text-[13px] leading-7 text-stone-600">
                    {record.inputSummary}
                  </p>
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
