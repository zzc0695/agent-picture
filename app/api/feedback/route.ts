import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireMerchantSession, unauthorizedResponse } from "@/lib/auth/require-session";
import { feedbackSchema } from "@/lib/feedback";
export async function POST(request: Request) {
 const session = await requireMerchantSession();
 if (!session) return unauthorizedResponse();
 const parsed = feedbackSchema.safeParse(await request.json().catch(() => null));
 if (!parsed.success) return NextResponse.json({ error: "请选择问题类型，填写 5 至 2000 字的问题描述" }, { status: 400 });
 const { planId, category, message } = parsed.data;
 const plan = await db.customerPlan.findFirst({ where: { id: planId, merchantId: session.merchantId }, select: { id: true, primaryImageUrl: true } });
 if (!plan) return NextResponse.json({ error: "方案不存在" }, { status: 404 });
 const record = await db.generationRecord.findFirst({ where: { merchantId: session.merchantId, type: "image_generation", OR: [{ planId }, ...(plan.primaryImageUrl ? [{ resultImageUrl: plan.primaryImageUrl }] : [])] }, orderBy: { createdAt: "desc" }, select: { id: true } });
 const feedback = await db.feedback.create({ data: { merchantId: session.merchantId, planId, recordId: record?.id ?? null, category, message } });
 return NextResponse.json({ id: feedback.id }, { status: 201 });
}
