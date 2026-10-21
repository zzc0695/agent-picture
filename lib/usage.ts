import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export function usageConfig(env: Record<string, string | undefined> = process.env) {
  function value(key: string, fallback: number) { const raw = env[key]; const n = raw ? Number(raw) : fallback; return Number.isFinite(n) && n >= 0 ? n : fallback; }
  return { dailyImages: Math.floor(value("AI_DAILY_IMAGE_LIMIT", 10)), dailyText: Math.floor(value("AI_DAILY_TEXT_LIMIT", 30)),
    concurrentImages: Math.floor(value("AI_MAX_CONCURRENT_IMAGES", 1)), imagePrice: value("AI_IMAGE_ESTIMATED_PRICE", 0), textPrice: value("AI_TEXT_ESTIMATED_PRICE", 0) };
}
export function merchantUsageConfig(m: { dailyImages: number | null; dailyText: number | null; concurrentImages: number | null }) { const c = usageConfig(); return { ...c, dailyImages: m.dailyImages ?? c.dailyImages, dailyText: m.dailyText ?? c.dailyText, concurrentImages: m.concurrentImages ?? c.concurrentImages }; }
export function usageDay(now = new Date()) {
  const date = new Date(now.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
  const start = new Date(`${date}T00:00:00+08:00`);
  return { date, start, end: new Date(start.getTime() + 24 * 3600_000) };
}
export class UsageLimitError extends Error { constructor(message: string) { super(message); this.name = "UsageLimitError"; } }
const textTypes = ["material_analysis", "prompt_optimization", "marketing_copy"];
export async function reserveUsage(input: { merchantId: string; type: string; inputSummary: string; inputData?: Prisma.InputJsonValue; planId?: string }) {
  const day = usageDay(); const image = input.type === "image_generation";
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(async tx => {
        const merchant = await tx.merchant.findUnique({ where: { id: input.merchantId } });
        if (!merchant || merchant.disabled) throw new UsageLimitError("账号已停用");
        const config = merchantUsageConfig(merchant);
        const count = await tx.generationRecord.count({ where: { merchantId: input.merchantId, type: image ? "image_generation" : { in: textTypes }, createdAt: { gte: day.start, lt: day.end } } });
        const limit = image ? config.dailyImages : config.dailyText;
        if (limit && count >= limit) throw new UsageLimitError(image ? "今日生图额度已用完，请明天再试" : "今日识别与文案额度已用完，请明天再试");
        if (image && config.concurrentImages) {
          const active = await tx.generationRecord.count({ where: { merchantId: input.merchantId, type: "image_generation", OR: [
            { status: "submitting", createdAt: { gt: new Date(Date.now() - 120_000) } },
            { status: "running", createdAt: { gt: new Date(Date.now() - 23 * 3600_000) } },
          ] } });
          if (active >= config.concurrentImages) throw new UsageLimitError("已有图片正在生成，请先查看该任务的结果");
        }
        return tx.generationRecord.create({ data: { ...input, status: "submitting", usageUnits: 0, estimatedCost: image ? config.imagePrice : config.textPrice } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (attempt < 2 && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") continue;
      throw error;
    }
  }
}
export async function usageSummary(merchantId: string) {
  const day = usageDay(); const records = await db.generationRecord.findMany({ where: { merchantId, createdAt: { gte: day.start, lt: day.end } }, select: { type: true, status: true, estimatedCost: true } });
  return { date: day.date, config: merchantUsageConfig(await db.merchant.findUniqueOrThrow({ where: { id: merchantId } })), images: records.filter(r => r.type === "image_generation").length,
    text: records.filter(r => textTypes.includes(r.type)).length, succeeded: records.filter(r => r.status === "succeeded").length,
    estimatedCost: records.reduce((sum, r) => sum + r.estimatedCost, 0) };
}
