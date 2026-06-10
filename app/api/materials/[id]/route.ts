import { NextResponse } from "next/server";
import { requireMerchantSession } from "@/lib/auth/require-session";
import { db } from "@/lib/db";
import { materialSchema } from "@/lib/validators";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireMerchantSession();
  const { id } = await params;
  const parsed = materialSchema.partial().safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "素材信息不完整", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const material = await db.material.update({
    where: { id, merchantId: session.merchantId },
    data: parsed.data,
  });

  return NextResponse.json({ material });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireMerchantSession();
  const { id } = await params;
  await db.material.delete({ where: { id, merchantId: session.merchantId } });

  return NextResponse.json({ ok: true });
}
