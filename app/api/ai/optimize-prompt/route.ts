import { NextResponse } from "next/server";
import { optimizePrompt } from "@/lib/ai/prompt";
import { aiErrorResponse } from "@/lib/ai/http";
import {
  requireMerchantSession,
  unauthorizedResponse,
} from "@/lib/auth/require-session";
import { trackedText } from "@/lib/ai/tracked-text";
import { fidelitySchema } from "@/lib/validators";

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await requireMerchantSession();
  if (!session) return unauthorizedResponse();
  const body = await request.json();
  const userPrompt = String(body.userPrompt ?? "");
  if (!userPrompt.trim()) {
    return NextResponse.json({ error: "请先填写生成要求" }, { status: 400 });
  }
  const materialSummary = String(body.materialSummary ?? "");
  const parsedFidelity = fidelitySchema.safeParse(body.fidelity ?? "strict");
  if (!parsedFidelity.success) {
    return NextResponse.json(
      { error: "样本还原度无效", issues: parsedFidelity.error.issues },
      { status: 400 },
    );
  }

  const fidelity = parsedFidelity.data;
  try {
    const result = await trackedText(session.merchantId, "prompt_optimization", userPrompt, () => optimizePrompt({ userPrompt, materialSummary, fidelity }));

    return NextResponse.json(result);
  } catch (error) {
    return aiErrorResponse(error, "AI 润色暂时失败，请稍后重试");
  }
}
