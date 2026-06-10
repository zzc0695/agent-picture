import { NextResponse } from "next/server";
import {
  requireMerchantSession,
  unauthorizedResponse,
} from "@/lib/auth/require-session";
import { db } from "@/lib/db";
import { planSchema } from "@/lib/validators";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireMerchantSession();
  if (!session) return unauthorizedResponse();
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
  if (!session) return unauthorizedResponse();
  const { id } = await params;
  const parsed = planSchema.partial().safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "客户方案信息不完整", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const planInput = { ...input };
  delete planInput.materialIds;
  const plan = await db.customerPlan.update({
    where: { id, merchantId: session.merchantId },
    data: planInput,
  });

  return NextResponse.json({ plan });
}
