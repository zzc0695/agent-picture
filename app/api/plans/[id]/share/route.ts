import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireMerchantSession, unauthorizedResponse } from "@/lib/auth/require-session";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireMerchantSession();
  if (!session) return unauthorizedResponse();
  const { id } = await params;
  const plan = await db.customerPlan.findFirst({ where: { id, merchantId: session.merchantId } });
  if (!plan) return NextResponse.json({ error: "客户方案不存在" }, { status: 404 });
  if (!plan.primaryImageUrl) return NextResponse.json({ error: "请先保存效果图再交付" }, { status: 400 });
  const active = plan.shareToken && plan.shareExpiresAt && plan.shareExpiresAt > new Date();
  const token = active ? plan.shareToken! : randomBytes(24).toString("hex");
  const expiresAt = active ? plan.shareExpiresAt! : new Date(Date.now() + 7 * 86400000);
  await db.customerPlan.update({ where: { id }, data: { shareToken: token, shareExpiresAt: expiresAt } });
  return NextResponse.json({ path: `/share/${token}`, expiresAt: expiresAt.toISOString() });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireMerchantSession();
  if (!session) return unauthorizedResponse();
  const { id } = await params;
  const result = await db.customerPlan.updateMany({ where: { id, merchantId: session.merchantId }, data: { shareToken: null, shareExpiresAt: null } });
  return result.count ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "客户方案不存在" }, { status: 404 });
}
