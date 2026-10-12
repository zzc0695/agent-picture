import { PreviewImage } from "@/components/preview-image";
import { notFound } from "next/navigation";
import { publicPlan } from "@/lib/plans";
import { DeliveryActions } from "@/components/delivery-actions";

export const metadata = { title: "您的软装方案", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SharedPlan({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const plan = await publicPlan(token);
  if (!plan?.primaryImageUrl) notFound();
  return <main className="mx-auto max-w-4xl space-y-8 px-5 py-10 print:py-0">
    <header><p className="text-sm text-sage">AI 软装 · 客户方案</p><h1 className="mt-3 font-serif text-3xl">{plan.customerName}的软装方案</h1><p className="mt-3 text-sm text-stone-500">效果图用于沟通设计方向，颜色与尺寸以实物和现场测量为准。</p></header>
    <DeliveryActions token={token} />
    <div className="grid gap-6 md:grid-cols-2 print:grid-cols-2">
      <figure><PreviewImage src={plan.roomImageUrl} alt="空间原图" className="aspect-square w-full rounded-xl object-contain" /><figcaption className="mt-2 text-center text-sm">空间原图</figcaption></figure>
      <figure><PreviewImage src={plan.primaryImageUrl} alt="软装效果图" className="aspect-square w-full rounded-xl object-contain" /><figcaption className="mt-2 text-center text-sm">软装效果图</figcaption></figure>
    </div>
    {plan.customerScript && <section className="break-inside-avoid"><h2 className="text-lg font-medium">方案说明</h2><p className="mt-4 whitespace-pre-wrap text-sm leading-8">{plan.customerScript}</p></section>}
  </main>;
}
