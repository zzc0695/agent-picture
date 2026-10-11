import { db } from "@/lib/db";
import { reserveUsage } from "@/lib/usage";
export function redactedError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/sk-[a-z0-9._-]+/gi, "[redacted-key]").replace(/Bearer\s+\S+/gi, "Bearer [redacted]").replace(/https?:\/\/\S+/gi, "[redacted-url]").slice(0, 1000);
}
export async function trackedText<T>(merchantId: string, type: string, summary: string, action: () => Promise<T>, planId?: string) {
  if (planId && !await db.customerPlan.findFirst({ where: { id: planId, merchantId } })) throw new Error("客户方案不存在");
  const record = await reserveUsage({ merchantId, type, inputSummary: summary.slice(0, 240), planId });
  const start = Date.now();
  try {
    const result = await action();
    await db.generationRecord.update({ where: { id: record.id }, data: { status: "succeeded", usageUnits: 1, timings: { totalMs: Date.now() - start } } });
    return result;
  } catch (error) {
    await db.generationRecord.update({ where: { id: record.id }, data: { status: "failed", failureReason: "AI 调用失败，请稍后重试", timings: { totalMs: Date.now() - start } } });
    console.error(JSON.stringify({ event: `${type}_failed`, recordId: record.id, errorMessage: redactedError(error) }));
    throw error;
  }
}
