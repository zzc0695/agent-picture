import { NextResponse } from "next/server";
import { optimizePrompt } from "@/lib/ai/prompt";
import { requireMerchantSession } from "@/lib/auth/require-session";
import { db } from "@/lib/db";
import { fidelitySchema } from "@/lib/validators";

export async function POST(request: Request) {
  const session = await requireMerchantSession();
  const body = await request.json();
  const userPrompt = String(body.userPrompt ?? "");
  const materialSummary = String(body.materialSummary ?? "");
  const fidelity = fidelitySchema.parse(body.fidelity ?? "strict");
  const result = await optimizePrompt({ userPrompt, materialSummary, fidelity });

  await db.generationRecord.create({
    data: {
      merchantId: session.merchantId,
      type: "prompt_optimization",
      inputSummary: userPrompt.slice(0, 240),
      status: "succeeded",
      usageUnits: 1,
    },
  });

  return NextResponse.json(result);
}
