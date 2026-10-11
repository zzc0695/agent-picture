import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customerSchema } from "@/lib/validators";
import { requireMerchantSession, unauthorizedResponse } from "@/lib/auth/require-session";
export async function GET() {
  const session = await requireMerchantSession(); if (!session) return unauthorizedResponse();
  const customers = await db.customer.findMany({ where: { merchantId: session.merchantId }, include: { _count: { select: { plans: true } } }, orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ customers });
}
export async function POST(request: Request) {
  const session = await requireMerchantSession(); if (!session) return unauthorizedResponse();
  const parsed = customerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "请填写客户姓名，联系信息和备注不能过长" }, { status: 400 });
  return NextResponse.json({ customer: await db.customer.create({ data: { ...parsed.data, merchantId: session.merchantId } }) }, { status: 201 });
}
