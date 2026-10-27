import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { feedbackCategories, feedbackStatuses } from "@/lib/feedback";
import { FeedbackStatus } from "@/components/feedback-status";
export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
 if (!await requireAdmin()) redirect("/");
 const query = await searchParams;
 const status = Object.hasOwn(feedbackStatuses, query.status ?? "") ? query.status! : "";
 const page = Math.max(1, Math.min(100000, Math.floor(Number(query.page) || 1)));
 const where = status ? { status } : {};
 const [total, items] = await Promise.all([db.feedback.count({ where }), db.feedback.findMany({ where, skip: (page - 1) * 20, take: 20, orderBy: [{ createdAt: "desc" }, { id: "desc" }], include: { merchant: { select: { name: true, email: true } }, plan: { select: { customerName: true } }, record: { select: { id: true, status: true, failureReason: true } } } })]);
 const href = (p: number) => `/admin/feedback?status=${status}&page=${p}`;
 return <section className="studio-page space-y-6"><header><h1 className="text-2xl font-semibold">用户反馈</h1><p className="mt-2 text-sm text-stone-500">共 {total} 条反馈 · 第 {page} 页</p></header><nav aria-label="筛选反馈" className="flex flex-wrap gap-4"><Link href="/admin/feedback" aria-current={!status ? "page" : undefined}>全部</Link>{Object.entries(feedbackStatuses).map(([key,label]) => <Link key={key} href={`/admin/feedback?status=${key}`} aria-current={status===key ? "page" : undefined}>{label}</Link>)}</nav>{!items.length && <p className="studio-card p-6">暂无反馈</p>}{items.map(item => <article key={item.id} className="studio-card p-6"><h2 className="font-semibold">{feedbackCategories[item.category as keyof typeof feedbackCategories] ?? item.category} · {feedbackStatuses[item.status as keyof typeof feedbackStatuses] ?? item.status}</h2><p className="mt-2 text-sm text-stone-500">{item.merchant.name} · {item.merchant.email} · {item.createdAt.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</p><p className="mt-4 whitespace-pre-wrap break-words">{item.message}</p><p className="mt-4 text-sm">关联方案：{item.plan ? `${item.plan.customerName}的方案（${item.planId}）` : "方案已删除"}</p><p className="mt-2 break-all text-sm">关联生成任务：{item.record ? `${item.record.id} · ${item.record.status}` : "无关联任务"}</p>{item.record?.failureReason && <p className="mt-2 text-sm text-red-700">失败原因：{item.record.failureReason}</p>}<FeedbackStatus key={`${item.id}-${item.status}`} id={item.id} status={item.status}/></article>)}<nav aria-label="反馈分页" className="flex gap-4">{page>1 && <Link href={href(page-1)}>上一页</Link>}{page*20<total && <Link href={href(page+1)}>下一页</Link>}</nav></section>;
}
