import { requireMerchantSession } from "@/lib/auth/require-session";
import { db } from "@/lib/db";

export default async function RecordsPage() {
  const session = await requireMerchantSession();
  const records = await db.generationRecord.findMany({
    where: { merchantId: session.merchantId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">生成记录</h1>
      <div className="grid gap-3">
        {records.map((record) => (
          <article key={record.id} className="rounded-md border bg-white p-3">
            <h2 className="font-medium">{record.type}</h2>
            <p className="mt-1 text-sm text-neutral-500">
              {record.status} · 消耗 {record.usageUnits}
            </p>
            <p className="mt-2 text-sm">{record.inputSummary}</p>
            {record.failureReason ? (
              <p className="mt-2 text-sm text-red-600">
                {record.failureReason}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
