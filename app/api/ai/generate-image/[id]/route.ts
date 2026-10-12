import { NextResponse } from "next/server";
import { pollImageJob } from "@/lib/ai/image-jobs";
import { aiErrorResponse } from "@/lib/ai/http";
import { requireMerchantSession, unauthorizedResponse } from "@/lib/auth/require-session";

export const maxDuration = 90;
export const preferredRegion = "hnd1";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireMerchantSession();
  if (!session) return unauthorizedResponse();
  try {
    const { id } = await params;
    const job = await pollImageJob(session.merchantId, id);
    return NextResponse.json(job ?? { error: "生成任务不存在" }, { status: job ? 200 : 404, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return aiErrorResponse(error, "暂时无法查询生成进度，请稍后继续查询");
  }
}
