import { NextResponse } from "next/server";
import { analyzeMaterials } from "@/lib/ai/material-analysis";
import {
  requireMerchantSession,
  unauthorizedResponse,
} from "@/lib/auth/require-session";
import { db } from "@/lib/db";
import { MaterialImageInputError } from "@/lib/files/storage";
import { materialAnalysisRequestSchema } from "@/lib/validators";

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
  } catch (error) {
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

    return NextResponse.json(
      { error: "AI 图片识别暂时失败，请稍后重试" },
      { status: 502 },
    );
  }
}
