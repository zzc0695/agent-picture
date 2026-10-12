import { NextResponse } from "next/server";
import { AiUnavailableError, AiResourceNotFoundError } from "@/lib/ai/errors";
import { MaterialImageInputError } from "@/lib/files/storage";
import { UsageLimitError } from "@/lib/usage";

export function aiErrorResponse(error: unknown, fallback: string) {
  if (error instanceof TypeError && error.cause && typeof error.cause === "object" && "code" in error.cause &&
      ["UND_ERR_CONNECT_TIMEOUT", "ETIMEDOUT", "ECONNRESET", "ENETUNREACH"].includes(String(error.cause.code))) {
    return NextResponse.json({ error: "服务器暂时无法连接生图服务。图片与要求已保留，请稍后重试。" }, { status: 503 });
  }
  if (error instanceof AiResourceNotFoundError) return NextResponse.json({ error: error.message }, { status: 404 });
  if (error instanceof UsageLimitError) return NextResponse.json({ error: error.message }, { status: 429 });
  // DOMException can come from a different realm and fail instanceof Error.
  if (typeof error === "object" && error !== null && "name" in error &&
      (error.name === "TimeoutError" || error.name === "AbortError")) {
    console.error(JSON.stringify({ event: "ai_request_timeout", errorType: error.name }));
    return NextResponse.json({ error: "AI 生成等待超时，请稍后重试" }, { status: 504 });
  }
  if (error instanceof AiUnavailableError) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
  if (error instanceof MaterialImageInputError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: fallback }, { status: 502 });
}
