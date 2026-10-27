import { FeedbackForm } from "@/components/feedback-form";
import { PreviewImage } from "@/components/preview-image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePageMerchantSession } from "@/lib/auth/require-session";
import { PlanManager } from "@/components/plan-manager";

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePageMerchantSession();
  const { id } = await params;
  const plan = await db.customerPlan.findFirst({ where: { id, merchantId: session.merchantId } });
  if (!plan) notFound();
  const source = plan.sourcePlanId ? await db.customerPlan.findFirst({ where: { id: plan.sourcePlanId, merchantId: session.merchantId } }) : null;
  const customers = await db.customer.findMany({ where: { merchantId: session.merchantId }, select: { id: true, name: true }, orderBy: { name: "asc" } });

  const copies = [
    ["短视频脚本", plan.shortVideoScript],
    ["社交分享文案", plan.socialCopy],
    ["客户沟通话术", plan.customerScript],
  ];

  return (
    <div className="studio-page studio-library-page space-y-6">
      <Link href="/plans" className="text-sm text-sage underline">返回客户方案</Link>
      <header>
        <h1 className="text-2xl font-semibold text-stone-800">{plan.customerName}的方案</h1>
        <p className="mt-2 text-sm text-stone-500">{plan.notes || "未填写备注"}</p>
      </header>
      <Link href={`/?planId=${plan.id}`} className="inline-block rounded-xl bg-sage px-5 py-3 text-sm text-white">继续调整 / 制作新版本</Link>
      {source && <section className="studio-card p-5"><Link href={`/plans/${source.id}`} className="text-sm text-sage underline">查看原方案</Link>{source.primaryImageUrl && <figure className="mt-4"><PreviewImage src={source.primaryImageUrl} alt="原方案效果图" className="max-h-72 w-full rounded-xl object-contain" /><figcaption className="mt-2 text-sm text-stone-500">原方案效果图，供与本版本比较</figcaption></figure>}</section>}
      <PlanManager plan={{ id: plan.id, customerId: plan.customerId, customerName: plan.customerName, notes: plan.notes, status: plan.status, shortVideoScript: plan.shortVideoScript, socialCopy: plan.socialCopy, customerScript: plan.customerScript, shareToken: plan.shareToken, shareExpiresAt: plan.shareExpiresAt?.toISOString() ?? null, primaryImageUrl: plan.primaryImageUrl }} customers={customers} />
      <section className="grid gap-4 md:grid-cols-2">
        <figure className="studio-card overflow-hidden p-3">
          <PreviewImage src={plan.roomImageUrl} alt="客户空间原图" className="aspect-square w-full rounded-xl object-contain" />
          <figcaption className="p-3 text-sm">客户空间原图</figcaption>
        </figure>
        {plan.primaryImageUrl ? <figure className="studio-card overflow-hidden p-3">
          <a href={plan.primaryImageUrl} target="_blank" rel="noreferrer" aria-label="打开完整效果图">
            <PreviewImage src={plan.primaryImageUrl} alt="已保存的效果图" className="aspect-square w-full rounded-xl object-contain" />
          </a>
          <figcaption className="flex items-center justify-between gap-3 p-3 text-sm">
            <span>已保存的效果图</span>
            <a href={`/api/files/download?url=${encodeURIComponent(plan.primaryImageUrl)}`} className="text-sage underline">下载高清图</a>
          </figcaption>
        </figure> : <p className="studio-card p-6">此方案尚未保存效果图。</p>}
      </section>
      <section className="studio-card p-6">
        <h2 className="font-semibold">生成要求</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{plan.optimizedPrompt || plan.originalPrompt}</p>
        <p className="mt-4 text-sm text-stone-500">还原度：{{ strict: "严格", balanced: "平衡", creative: "创意" }[plan.fidelity] ?? plan.fidelity}</p>
      </section>
      <FeedbackForm planId={plan.id} />
      {copies.map(([title, copy]) => <section key={title} className="studio-card p-6">
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{copy || "此方案未保存该文案。"}</p>
      </section>)}
    </div>
  );
}
