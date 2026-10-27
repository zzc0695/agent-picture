import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { feedbackUpdateSchema } from "@/lib/feedback";
export async function PATCH(request: Request) {
 if (!await requireAdmin()) return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
 const parsed = feedbackUpdateSchema.safeParse(await request.json().catch(() => null));
 if (!parsed.success) return NextResponse.json({ error: "反馈状态无效" }, { status: 400 });
 const result = await db.feedback.updateMany({ where: { id: parsed.data.id }, data: { status: parsed.data.status } });
 return NextResponse.json(result.count ? { ok: true } : { error: "反馈不存在" }, { status: result.count ? 200 : 404 });
}
