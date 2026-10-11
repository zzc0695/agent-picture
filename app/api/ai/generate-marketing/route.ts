import { NextResponse } from "next/server";
import { generateMarketingCopy } from "@/lib/ai/marketing";
import { aiErrorResponse } from "@/lib/ai/http";
import { trackedText } from "@/lib/ai/tracked-text";
import { requireMerchantSession, unauthorizedResponse } from "@/lib/auth/require-session";
export const maxDuration = 60;
export async function POST(request: Request) {
  const session = await requireMerchantSession(); if (!session) return unauthorizedResponse();
  const body = await request.json();
  if (!String(body.roomSummary ?? "").trim() || !String(body.effectImageUrl ?? "").trim()) return NextResponse.json({ error: "请先生成效果图并填写方案要求" }, { status: 400 });
  try {
    const result = await trackedText(session.merchantId, "marketing_copy", String(body.materialSummary ?? ""), () => generateMarketingCopy({ materialSummary: String(body.materialSummary ?? ""), roomSummary: String(body.roomSummary ?? ""), effectImageUrl: String(body.effectImageUrl ?? ""), customerNotes: String(body.customerNotes ?? "") }), body.planId);
    return NextResponse.json(result);
  } catch (error) { return aiErrorResponse(error, "AI 营销文案生成暂时失败，请稍后重试"); }
}
