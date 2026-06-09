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
  const input = materialSchema.partial().parse(await request.json());
  const material = await db.material.update({
    where: { id, merchantId: session.merchantId },
    data: input,
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
