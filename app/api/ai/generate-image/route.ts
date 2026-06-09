import { NextResponse } from "next/server";
import { generateEffectImage } from "@/lib/ai/image";
import { requireMerchantSession } from "@/lib/auth/require-session";
import { db } from "@/lib/db";
import { fidelitySchema } from "@/lib/validators";

export async function POST(request: Request) {
  const session = await requireMerchantSession();
  const body = await request.json();
  const result = await generateEffectImage({
    roomImageUrl: String(body.roomImageUrl ?? ""),
    sampleImageUrl: String(body.sampleImageUrl ?? ""),
    optimizedPrompt: String(body.optimizedPrompt ?? ""),
    negativePrompt: String(body.negativePrompt ?? ""),
    fidelity: fidelitySchema.parse(body.fidelity ?? "strict"),
    referenceImageUrl: body.referenceImageUrl
      ? String(body.referenceImageUrl)
      : undefined,
  });

  await db.generationRecord.create({
    data: {
      merchantId: session.merchantId,
      planId: body.planId ? String(body.planId) : undefined,
      type: "image_generation",
      inputSummary: result.inputSummary,
      status: "succeeded",
      usageUnits: 1,
    },
  });

  return NextResponse.json(result);
}
