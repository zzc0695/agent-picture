import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { InvitationManager } from "@/components/invitation-manager";
export default async function InvitationsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
 if (!await requireAdmin()) redirect("/");
 const query = await searchParams; const page = Math.max(1, Math.min(100000, Math.floor(Number(query.page) || 1)));
 const [total, items] = await Promise.all([db.invitation.count(), db.invitation.findMany({ skip: (page-1)*20, take:20, orderBy: [{createdAt:"desc"},{id:"desc"}] })]);
 // Server-rendered timestamp snapshots invite expiry for this request.
 // eslint-disable-next-line react-hooks/purity
 const now = Date.now();
 return <section className="studio-page admin-page space-y-6"><header><h1 className="text-2xl font-semibold">试用邀请</h1><p className="mt-2 text-sm text-stone-500">把邀请链接发给商家，无需邮箱即可注册。到期或关闭后停止新注册，已注册账号的使用权限在用户管理中调整。</p></header><InvitationManager now={now} items={items.map(({ id, code, label, maxUses, usedCount, expiresAt, disabled, dailyImages, dailyText, concurrentImages })=>({ id, code, label, maxUses, usedCount, expiresAt: expiresAt.toISOString(), disabled, dailyImages, dailyText, concurrentImages }))}/><nav className="flex flex-wrap items-center gap-4" aria-label="邀请分页"><span>共 {total} 条 · 第 {page} 页</span>{page>1 && <Link href={`/admin/invitations?page=${page-1}`}>上一页</Link>}{page*20<total && <Link href={`/admin/invitations?page=${page+1}`}>下一页</Link>}</nav></section>;
}
