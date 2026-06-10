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
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">素材库</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {materials.map((material) => (
          <MaterialCard key={material.id} material={material} />
        ))}
      </div>
    </div>
  );
}
