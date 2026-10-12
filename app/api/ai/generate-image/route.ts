import { NextResponse } from "next/server";
import { startImageJob } from "@/lib/ai/image-jobs";
import { aiErrorResponse } from "@/lib/ai/http";
import { requireMerchantSession, unauthorizedResponse } from "@/lib/auth/require-session";
import { imageGenerationRequestSchema } from "@/lib/validators";
import { db } from "@/lib/db";
export const maxDuration = 90;
export async function GET() {
  const session = await requireMerchantSession();
  if (!session) return unauthorizedResponse();
  const job = await db.generationRecord.findFirst({ where: { merchantId: session.merchantId, type: "image_generation",
    status: { in: ["submitting", "running"] }, createdAt: { gt: new Date(Date.now() - 23 * 3600_000) } }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ jobId: job?.id ?? null }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: Request) {
  const session = await requireMerchantSession();
  if (!session) return unauthorizedResponse();
  const parsed = imageGenerationRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "效果图生成信息不完整或样本还原度无效" }, { status: 400 });
  try {
    return NextResponse.json(await startImageJob(session.merchantId, parsed.data), { status: 202 });
  } catch (error) { return aiErrorResponse(error, "AI 任务提交失败，请稍后重试"); }
}
