import { CustomerPlanCard } from "@/components/customer-plan-card";
import { requirePageMerchantSession } from "@/lib/auth/require-session";
import { db } from "@/lib/db";

export default async function PlansPage() {
  const session = await requirePageMerchantSession();
  const plans = await db.customerPlan.findMany({
    where: { merchantId: session.merchantId },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="studio-page studio-library-page">
      <PageHeader
        eyebrow="CUSTOMER PROPOSALS"
        title="客户方案"
        description="保存后的客户方案按当前状态和更新时间展示，后端方案数据结构保持不变。"
      />
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
        <EmptyState title="还没有方案" body="从工作台保存方案后会出现在这里。" />
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
