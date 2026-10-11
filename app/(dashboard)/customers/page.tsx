import { db } from "@/lib/db";
import { requirePageMerchantSession } from "@/lib/auth/require-session";
import { CustomerManager } from "@/components/customer-manager";
export default async function CustomersPage() {
  const session = await requirePageMerchantSession();
  const customers = await db.customer.findMany({ where: { merchantId: session.merchantId }, include: { _count: { select: { plans: true } } }, orderBy: { updatedAt: "desc" } });
  return <div className="studio-page studio-library-page space-y-6"><h1 className="text-2xl font-semibold">客户管理</h1><p className="text-sm text-stone-500">记录联系方式，按客户查看搭配方案。</p><CustomerManager customers={customers.map(({ id, name, contact, notes, _count }) => ({ id, name, contact, notes, _count }))} /></div>;
}
