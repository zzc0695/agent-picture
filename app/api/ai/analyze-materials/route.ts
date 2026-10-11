import { NextResponse } from "next/server";
import { analyzeMaterials } from "@/lib/ai/material-analysis";
import {
  requireMerchantSession,
  unauthorizedResponse,
} from "@/lib/auth/require-session";
import { trackedText } from "@/lib/ai/tracked-text";
import { UsageLimitError } from "@/lib/usage";
import { MaterialImageInputError } from "@/lib/files/storage";
import { materialAnalysisRequestSchema } from "@/lib/validators";
import { AiUnavailableError } from "@/lib/ai/errors";

export const maxDuration = 60;

function redactedErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return message
    .replace(/sk-[a-z0-9._-]+/gi, "[redacted-key]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/https?:\/\/\S+/gi, "[redacted-url]");
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const session = await requireMerchantSession();
  if (!session) return unauthorizedResponse();
  const parsed = materialAnalysisRequestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "图片识别信息不完整", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const result = await trackedText(session.merchantId, "material_analysis", "三图素材识别", () => analyzeMaterials(parsed.data));

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UsageLimitError) return NextResponse.json({ error: error.message }, { status: 429 });
    console.error(
      JSON.stringify({
        level: "error",
        event: "material_analysis_failed",
        route: "/api/ai/analyze-materials",
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage: redactedErrorMessage(error),
        durationMs: Date.now() - startedAt,
        requestId: request.headers.get("x-vercel-id") ?? undefined,
      }),
    );

    if (error instanceof MaterialImageInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof AiUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    return NextResponse.json(
      { error: "AI 图片识别暂时失败，请稍后重试" },
      { status: 502 },
    );
  }
}
