import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customerSchema } from "@/lib/validators";
import { requireMerchantSession, unauthorizedResponse } from "@/lib/auth/require-session";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, { params }: Context) {
  const session = await requireMerchantSession(); if (!session) return unauthorizedResponse();
  const { id } = await params;
  const parsed = customerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "客户信息不完整" }, { status: 400 });
  const changed = await db.customer.updateMany({ where: { id, merchantId: session.merchantId }, data: parsed.data });
  return NextResponse.json(changed.count ? { ok: true } : { error: "客户不存在" }, { status: changed.count ? 200 : 404 });
}
export async function DELETE(_request: Request, { params }: Context) {
  const session = await requireMerchantSession(); if (!session) return unauthorizedResponse();
  const { id } = await params;
  const removed = await db.customer.deleteMany({ where: { id, merchantId: session.merchantId } });
  return NextResponse.json(removed.count ? { ok: true } : { error: "客户不存在" }, { status: removed.count ? 200 : 404 });
}
