import { NextResponse } from "next/server";
import { AiUnavailableError } from "@/lib/ai/errors";
import { MaterialImageInputError } from "@/lib/files/storage";

export function aiErrorResponse(error: unknown, fallback: string) {
  // DOMException can come from a different realm and fail instanceof Error.
  if (typeof error === "object" && error !== null && "name" in error &&
      (error.name === "TimeoutError" || error.name === "AbortError")) {
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
