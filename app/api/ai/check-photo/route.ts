import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMerchantSession, unauthorizedResponse } from "@/lib/auth/require-session";
import { checkPhoto } from "@/lib/ai/photo-check";
import { aiErrorResponse } from "@/lib/ai/http";
export const maxDuration = 45;
export async function POST(request: Request) {
  if (!await requireMerchantSession()) return unauthorizedResponse();
  const parsed = z.object({url:z.string().min(1),role:z.enum(["room","style","detail"])}).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({error:"请选择要检查的照片"},{status:400});
  try { return NextResponse.json(await checkPhoto(parsed.data.url, parsed.data.role)); }
  catch (error) { return aiErrorResponse(error,"照片检查暂时不可用，仍可继续制作方案"); }
}
