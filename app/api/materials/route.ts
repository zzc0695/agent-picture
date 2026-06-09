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
  const input = materialSchema.parse(await request.json());
  const material = await db.material.create({
    data: { ...input, merchantId: session.merchantId },
  });

  return NextResponse.json({ material }, { status: 201 });
}
