export function CustomerPlanCard({
  plan,
}: {
  plan: { customerName: string; notes: string; status: string; createdAt: string };
}) {
  return (
    <article className="rounded-md border bg-white p-3">
      <h3 className="font-medium">{plan.customerName}</h3>
      <p className="mt-1 text-sm text-neutral-500">{plan.notes || "无备注"}</p>
      <p className="mt-2 text-xs text-neutral-500">
        {plan.status} · {new Date(plan.createdAt).toLocaleString()}
      </p>
    </article>
  );
}
