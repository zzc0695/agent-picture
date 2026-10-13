import { NextResponse } from "next/server";
import { createGroundedPrompt } from "@/lib/ai/grounded-prompt";
import { toAsyncImageReference } from "@/lib/files/storage";
import { aiErrorResponse } from "@/lib/ai/http";
import {
  requireMerchantSession,
  unauthorizedResponse,
} from "@/lib/auth/require-session";
import { trackedText } from "@/lib/ai/tracked-text";
import { fidelitySchema, materialAnalysisRequestSchema } from "@/lib/validators";

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await requireMerchantSession();
  if (!session) return unauthorizedResponse();
  const body = await request.json();
  const userPrompt = String(body.userPrompt ?? "");
  if (!userPrompt.trim()) {
    return NextResponse.json({ error: "请先填写生成要求" }, { status: 400 });
  }
  const images = materialAnalysisRequestSchema.safeParse(body);
  const parsedFidelity = fidelitySchema.safeParse(body.fidelity ?? "strict");
  if (!parsedFidelity.success) {
    return NextResponse.json(
      { error: "样本还原度无效", issues: parsedFidelity.error.issues },
      { status: 400 },
    );
  }

  const fidelity = parsedFidelity.data;
  if (!images.success) return NextResponse.json({ error: "请先上传房间图、款式图和材质图，再根据图片润色要求" }, { status: 400 });
  try {
    const result = await trackedText(session.merchantId, "prompt_optimization", userPrompt, async () => {
      const references = await Promise.all([images.data.roomImageUrl, images.data.styleImageUrl, images.data.detailImageUrl,...images.data.supplementalImages.map(photo => photo.url)].map(toAsyncImageReference));
      return createGroundedPrompt(references, userPrompt, fidelity, images.data.supplementalImages.map(photo => photo.role));
    });

    return NextResponse.json(result);
  } catch (error) {
    return aiErrorResponse(error, "AI 润色暂时失败，请稍后重试");
  }
}
