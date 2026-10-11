import { NextResponse } from "next/server";
import { generateMarketingCopy } from "@/lib/ai/marketing";
import { aiErrorResponse } from "@/lib/ai/http";
import {
  requireMerchantSession,
  unauthorizedResponse,
} from "@/lib/auth/require-session";
import { db } from "@/lib/db";

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await requireMerchantSession();
  if (!session) return unauthorizedResponse();
  const body = await request.json();
  if (!String(body.roomSummary ?? "").trim() || !String(body.effectImageUrl ?? "").trim()) {
    return NextResponse.json({ error: "请先生成效果图并填写方案要求" }, { status: 400 });
  }
  try {
    const result = await generateMarketingCopy({
      materialSummary: String(body.materialSummary ?? ""),
      roomSummary: String(body.roomSummary ?? ""),
      effectImageUrl: String(body.effectImageUrl ?? ""),
      customerNotes: String(body.customerNotes ?? ""),
    });

    await db.generationRecord.create({
      data: {
        merchantId: session.merchantId,
        planId: body.planId ? String(body.planId) : undefined,
        type: "marketing_copy",
        inputSummary: `${body.materialSummary ?? ""}`.slice(0, 240),
        status: "succeeded",
        usageUnits: 1,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    return aiErrorResponse(error, "AI 营销文案生成暂时失败，请稍后重试");
  }
}
