import { NextResponse } from "next/server";
import { requireMerchantSession } from "@/lib/auth/require-session";
import { db } from "@/lib/db";
import { materialSchema } from "@/lib/validators";

export async function GET() {
  const session = await requireMerchantSession();
  const materials = await db.material.findMany({
    where: { merchantId: session.merchantId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ materials });
}

export async function POST(request: Request) {
  const session = await requireMerchantSession();
  const parsed = materialSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "素材信息不完整", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const material = await db.material.create({
    data: { ...parsed.data, merchantId: session.merchantId },
  });

  return NextResponse.json({ material }, { status: 201 });
}
