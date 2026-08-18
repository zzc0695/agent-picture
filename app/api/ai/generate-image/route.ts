import { NextResponse } from "next/server";
import { generateEffectImage } from "@/lib/ai/image";
import {
  requireMerchantSession,
  unauthorizedResponse,
} from "@/lib/auth/require-session";
import { db } from "@/lib/db";
import {
  fidelitySchema,
  imageGenerationRequestSchema,
} from "@/lib/validators";

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await requireMerchantSession();
  if (!session) return unauthorizedResponse();
  const body = await request.json();
  const parsedFidelity = fidelitySchema.safeParse(body.fidelity ?? "strict");
  if (!parsedFidelity.success) {
    return NextResponse.json(
      { error: "样本还原度无效", issues: parsedFidelity.error.issues },
      { status: 400 },
    );
  }

  const parsed = imageGenerationRequestSchema.safeParse({
    ...body,
    fidelity: parsedFidelity.data,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "效果图生成信息不完整", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const result = await generateEffectImage({
    roomImageUrl: parsed.data.roomImageUrl,
    styleImageUrl: parsed.data.styleImageUrl,
    detailImageUrl: parsed.data.detailImageUrl,
    optimizedPrompt: parsed.data.optimizedPrompt,
    negativePrompt: parsed.data.negativePrompt,
    fidelity: parsed.data.fidelity,
    imageAnalysis: parsed.data.imageAnalysis,
    referenceImageUrl: parsed.data.referenceImageUrl,
  });

  await db.generationRecord.create({
    data: {
      merchantId: session.merchantId,
      planId: parsed.data.planId,
      type: "image_generation",
      inputSummary: result.inputSummary,
      status: "succeeded",
      usageUnits: 1,
    },
  });

  return NextResponse.json(result);
}
