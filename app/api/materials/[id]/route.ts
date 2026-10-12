import { NextResponse } from "next/server";
import {
  requireMerchantSession,
  unauthorizedResponse,
} from "@/lib/auth/require-session";
import { db } from "@/lib/db";
import { materialSchema } from "@/lib/validators";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireMerchantSession();
  if (!session) return unauthorizedResponse();
  const { id } = await params;
  const body = await request.json();
  const parsed = materialSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "素材信息不完整", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const data = Object.fromEntries(Object.entries(parsed.data).filter(([key]) => key in body));
  const changed = await db.material.updateMany({ where: { id, merchantId: session.merchantId }, data });
  if (!changed.count) return NextResponse.json({ error: "素材不存在" }, { status: 404 });
  const material = await db.material.findFirst({ where: { id, merchantId: session.merchantId } });
  return NextResponse.json({ material });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireMerchantSession();
  if (!session) return unauthorizedResponse();
  const { id } = await params;
  const deleted = await db.material.deleteMany({ where: { id, merchantId: session.merchantId } });
  return deleted.count ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "素材不存在" }, { status: 404 });
}
