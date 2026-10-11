import { requirePageMerchantSession } from "@/lib/auth/require-session";
import { usageSummary } from "@/lib/usage";
export default async function UsagePage() {
  const session = await requirePageMerchantSession(); const usage = await usageSummary(session.merchantId);
  return <div className="studio-page studio-library-page space-y-6"><h1 className="text-2xl font-semibold">今日用量</h1>
    <p className="text-sm text-stone-500">{usage.date} · 每天北京时间 00:00 重置</p>
    <div className="grid gap-4 sm:grid-cols-2">
      <section className="studio-card p-6"><h2>生图调用</h2><p className="mt-3 text-2xl">{usage.images} / {usage.config.dailyImages || "不限"}</p></section>
      <section className="studio-card p-6"><h2>图片识别、润色与文案</h2><p className="mt-3 text-2xl">{usage.text} / {usage.config.dailyText || "不限"}</p></section>
    </div>
    <section className="studio-card space-y-3 p-6"><p>今日成功调用：{usage.succeeded} 次</p><p>同时生图上限：{usage.config.concurrentImages || "不限"}</p>
      <p>预估调用成本：{usage.config.imagePrice || usage.config.textPrice ? `¥${usage.estimatedCost.toFixed(2)}` : "尚未配置单价"}</p>
      <p className="text-sm text-stone-500">额度按调用尝试计数，包含失败请求；预估成本按配置单价计算，不是供应商账单。当前不扣费。</p></section>
  </div>;
}
