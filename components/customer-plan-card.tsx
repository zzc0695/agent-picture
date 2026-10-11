import { ArrowRight, Images } from "lucide-react";
import Link from "next/link";

export function CustomerPlanCard({
  plan,
}: {
  plan: {
    id: string;
    customerName: string;
    notes: string;
    status: string;
    createdAt: string;
  };
}) {
  return (
    <Link href={`/plans/${plan.id}`} aria-label={`查看${plan.customerName}的${plan.notes || "客户方案"}`} className="studio-card group flex items-center gap-4 p-4 focus-visible:outline-2 focus-visible:outline-sage">
      <div className="grid size-14 flex-shrink-0 place-items-center rounded-2xl bg-sage text-white shadow-lg shadow-sage/20">
        <Images size={22} strokeWidth={1.5} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-serif text-[17px] font-medium text-stone-800">
          {plan.customerName}
        </h3>
        <p className="mt-1 truncate text-[13px] text-stone-500">
          {plan.notes || "无备注"}
        </p>
        <p className="mt-2 text-[11px] font-medium tracking-wide text-stone-400">
          {plan.status === "ready" ? "已生成" : plan.status === "draft" ? "草稿" : plan.status === "delivered" ? "已交付" : plan.status} · {new Date(plan.createdAt).toLocaleString("zh-CN")}
        </p>
      </div>
      <ArrowRight
        size={18}
        strokeWidth={1.5}
        className="text-stone-300 transition-transform group-hover:translate-x-1 group-hover:text-sage"
      />
    </Link>
  );
}
