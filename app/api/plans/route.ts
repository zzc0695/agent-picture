import { NextResponse } from "next/server";
import {
  requireMerchantSession,
  unauthorizedResponse,
} from "@/lib/auth/require-session";
import { db } from "@/lib/db";
import { planSchema } from "@/lib/validators";
import { ownedCustomer } from "@/lib/plans";

export async function GET() {
  const session = await requireMerchantSession();
  if (!session) return unauthorizedResponse();
  const plans = await db.customerPlan.findMany({
    where: { merchantId: session.merchantId },
    include: { materials: { include: { material: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ plans });
}

export async function POST(request: Request) {
  const session = await requireMerchantSession();
  if (!session) return unauthorizedResponse();
  const parsed = planSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "客户方案信息不完整", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const customer = await ownedCustomer(session.merchantId, input.customerId);
  if (input.customerId && !customer) return NextResponse.json({ error: "客户不存在" }, { status: 404 });
  if (input.materialIds.length && await db.material.count({ where: { id: { in: input.materialIds }, merchantId: session.merchantId } }) !== new Set(input.materialIds).size) {
    return NextResponse.json({ error: "素材不存在" }, { status: 404 });
  }
  const plan = await db.customerPlan.create({
    data: {
      merchantId: session.merchantId,
      customerName: customer?.name ?? input.customerName,
      customerId: customer?.id ?? null,
      notes: input.notes,
      roomImageUrl: input.roomImageUrl,
      sampleImageUrl: input.styleImageUrl,
      styleImageUrl: input.styleImageUrl,
      detailImageUrl: input.detailImageUrl,
      imageAnalysis: input.imageAnalysis,
      originalPrompt: input.originalPrompt,
      optimizedPrompt: input.optimizedPrompt,
      negativePrompt: input.negativePrompt,
      fidelity: input.fidelity,
      primaryImageUrl: input.primaryImageUrl || null,
      shortVideoScript: input.shortVideoScript || null,
      socialCopy: input.socialCopy || null,
      customerScript: input.customerScript || null,
      status: input.status,
      materials: {
        create: input.materialIds.map((materialId) => ({ materialId })),
      },
    },
    include: { materials: true },
  });

  return NextResponse.json({ plan }, { status: 201 });
}
