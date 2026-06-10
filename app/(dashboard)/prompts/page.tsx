import { BookOpenText } from "lucide-react";
import { requirePageMerchantSession } from "@/lib/auth/require-session";
import { db } from "@/lib/db";

export default async function PromptsPage() {
  const session = await requirePageMerchantSession();
  const templates = await db.promptTemplate.findMany({
    where: { OR: [{ isSystem: true }, { merchantId: session.merchantId }] },
    orderBy: [{ isSystem: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="studio-page studio-library-page">
      <PageHeader
        eyebrow="PROMPT ATELIER"
        title="提示词库"
        description="模板分类继续使用当前系统分类和商家自定义分类，只替换展示方式。"
      />
      {templates.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {templates.map((template) => (
            <article key={template.id} className="studio-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="grid size-11 flex-shrink-0 place-items-center rounded-2xl bg-sage/10 text-sage">
                  <BookOpenText size={19} strokeWidth={1.5} />
                </div>
                <span className="rounded-full bg-white/65 px-3 py-1 text-[11px] font-medium text-stone-500 shadow-sm">
                  {template.isSystem ? "系统" : "我的"}
                </span>
              </div>
              <h2 className="mt-4 font-serif text-[18px] font-medium text-stone-800">
                {template.title}
              </h2>
              <p className="mt-2 text-[12px] font-medium tracking-wide text-sage">
                {template.category}
              </p>
              <p className="mt-4 text-[13px] leading-7 text-stone-600">
                {template.body}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="还没有提示词" body="系统模板或自定义模板会显示在这里。" />
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
