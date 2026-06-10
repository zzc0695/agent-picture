import { NextResponse } from "next/server";
import {
  requireMerchantSession,
  unauthorizedResponse,
} from "@/lib/auth/require-session";
import { db } from "@/lib/db";
import { promptTemplateSchema } from "@/lib/validators";

export async function GET() {
  const session = await requireMerchantSession();
  if (!session) return unauthorizedResponse();
  const templates = await db.promptTemplate.findMany({
    where: { OR: [{ isSystem: true }, { merchantId: session.merchantId }] },
    orderBy: [{ isSystem: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const session = await requireMerchantSession();
  if (!session) return unauthorizedResponse();
  const parsed = promptTemplateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "提示词模板信息不完整", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const template = await db.promptTemplate.create({
    data: { ...parsed.data, merchantId: session.merchantId, isSystem: false },
  });

  return NextResponse.json({ template }, { status: 201 });
}
