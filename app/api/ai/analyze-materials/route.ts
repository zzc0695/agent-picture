import { NextResponse } from "next/server";
import { analyzeMaterials } from "@/lib/ai/material-analysis";
import {
  requireMerchantSession,
  unauthorizedResponse,
} from "@/lib/auth/require-session";
import { db } from "@/lib/db";
import { materialAnalysisRequestSchema } from "@/lib/validators";

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await requireMerchantSession();
  if (!session) return unauthorizedResponse();
  const parsed = materialAnalysisRequestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "图片识别信息不完整", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const result = await analyzeMaterials(parsed.data);
  await db.generationRecord.create({
    data: {
      merchantId: session.merchantId,
      type: "material_analysis",
      inputSummary: result.templatePrompt.slice(0, 240),
      status: "succeeded",
      usageUnits: 1,
    },
  });

  return NextResponse.json(result);
}
