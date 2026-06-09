import { NextResponse } from "next/server";
import { requireMerchantSession } from "@/lib/auth/require-session";
import { db } from "@/lib/db";
import { planSchema } from "@/lib/validators";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireMerchantSession();
  const { id } = await params;
  const plan = await db.customerPlan.findFirst({
    where: { id, merchantId: session.merchantId },
    include: { materials: { include: { material: true } }, records: true },
  });

  if (!plan) {
    return NextResponse.json({ error: "客户方案不存在" }, { status: 404 });
  }

  return NextResponse.json({ plan });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireMerchantSession();
  const { id } = await params;
  const input = planSchema.partial().parse(await request.json());
  const planInput = { ...input };
  delete planInput.materialIds;
  const plan = await db.customerPlan.update({
    where: { id, merchantId: session.merchantId },
    data: planInput,
  });

  return NextResponse.json({ plan });
}
