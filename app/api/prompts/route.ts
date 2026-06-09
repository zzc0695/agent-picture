import { NextResponse } from "next/server";
import { requireMerchantSession } from "@/lib/auth/require-session";
import { db } from "@/lib/db";
import { promptTemplateSchema } from "@/lib/validators";

export async function GET() {
  const session = await requireMerchantSession();
  const templates = await db.promptTemplate.findMany({
    where: { OR: [{ isSystem: true }, { merchantId: session.merchantId }] },
    orderBy: [{ isSystem: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const session = await requireMerchantSession();
  const input = promptTemplateSchema.parse(await request.json());
  const template = await db.promptTemplate.create({
    data: { ...input, merchantId: session.merchantId, isSystem: false },
  });

  return NextResponse.json({ template }, { status: 201 });
}
