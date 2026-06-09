import { CustomerPlanCard } from "@/components/customer-plan-card";
import { requireMerchantSession } from "@/lib/auth/require-session";
import { db } from "@/lib/db";

export default async function PlansPage() {
  const session = await requireMerchantSession();
  const plans = await db.customerPlan.findMany({
    where: { merchantId: session.merchantId },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">客户方案</h1>
      <div className="grid gap-3">
        {plans.map((plan) => (
          <CustomerPlanCard
            key={plan.id}
            plan={{ ...plan, createdAt: plan.createdAt.toISOString() }}
          />
        ))}
      </div>
    </div>
  );
}
