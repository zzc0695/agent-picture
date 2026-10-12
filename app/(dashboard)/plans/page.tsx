import { CustomerPlanCard } from "@/components/customer-plan-card";
import { requirePageMerchantSession } from "@/lib/auth/require-session";
import { db } from "@/lib/db";

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ q?: string; customerId?: string; status?: string }> }) {
  const session = await requirePageMerchantSession();
  const filters = await searchParams;
  const customers = await db.customer.findMany({ where: { merchantId: session.merchantId }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const plans = await db.customerPlan.findMany({
    where: { merchantId: session.merchantId, ...(filters.customerId ? { customerId: filters.customerId } : {}), ...(["draft", "ready", "delivered"].includes(filters.status ?? "") ? { status: filters.status } : {}), ...(filters.q?.trim() ? { OR: [{ customerName: { contains: filters.q.trim(), mode: "insensitive" as const } }, { notes: { contains: filters.q.trim(), mode: "insensitive" as const } }] } : {}) },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="studio-page studio-library-page">
      <PageHeader
        eyebrow="CUSTOMER PROPOSALS"
        title="客户方案"
        description="查看已保存的客户方案，点击卡片打开效果图、生成要求和营销文案。"
      />
      <form className="mb-6 flex flex-wrap gap-3" action="/plans">
        <input aria-label="搜索方案" name="q" defaultValue={filters.q} placeholder="搜索客户、房间或备注" className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm" />
        <select aria-label="筛选客户" name="customerId" defaultValue={filters.customerId ?? ""} className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm"><option value="">所有客户</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select>
        <select aria-label="筛选状态" name="status" defaultValue={filters.status ?? ""} className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm"><option value="">所有状态</option><option value="draft">草稿</option><option value="ready">已生成</option><option value="delivered">已交付</option></select>
        <button className="rounded-xl bg-sage px-5 py-3 text-sm text-white">筛选</button>
      </form>
      {plans.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {plans.map((plan) => (
            <CustomerPlanCard
              key={plan.id}
              plan={{ ...plan, createdAt: plan.createdAt.toISOString() }}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="没有符合条件的方案" body="可调整筛选条件，或从工作台保存新方案。" />
      )}
    </div>
  );
}

function PageHeader({
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="library-header">

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
