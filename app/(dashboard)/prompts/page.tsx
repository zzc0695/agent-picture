import { requirePageMerchantSession } from "@/lib/auth/require-session";
import { db } from "@/lib/db";

export default async function PromptsPage() {
  const session = await requirePageMerchantSession();
  const templates = await db.promptTemplate.findMany({
    where: { OR: [{ isSystem: true }, { merchantId: session.merchantId }] },
    orderBy: [{ isSystem: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">提示词库</h1>
      <div className="grid gap-3">
        {templates.map((template) => (
          <article key={template.id} className="rounded-md border bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-medium">{template.title}</h2>
              <span className="rounded bg-neutral-100 px-2 py-1 text-xs">
                {template.isSystem ? "系统" : "我的"}
              </span>
            </div>
            <p className="mt-2 text-sm text-neutral-500">{template.category}</p>
            <p className="mt-2 text-sm">{template.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
