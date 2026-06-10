import { MaterialCard } from "@/components/material-card";
import { requirePageMerchantSession } from "@/lib/auth/require-session";
import { db } from "@/lib/db";

export default async function MaterialsPage() {
  const session = await requirePageMerchantSession();
  const materials = await db.material.findMany({
    where: { merchantId: session.merchantId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="studio-page studio-library-page">
      <PageHeader
        eyebrow="MATERIAL LIBRARY"
        title="素材库"
        description="集中管理窗帘、布料、五金和软装样本，生成时仍使用现有素材分类。"
      />
      {materials.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {materials.map((material) => (
            <MaterialCard key={material.id} material={material} />
          ))}
        </div>
      ) : (
        <EmptyState title="还没有素材" body="新增素材后会以当前分类显示在这里。" />
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
