import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireMerchantSession, unauthorizedResponse } from "@/lib/auth/require-session";
export async function POST() {
  const session = await requireMerchantSession();
  if (!session) return unauthorizedResponse();
  await db.merchant.update({ where: { id: session.merchantId }, data: { onboarded: true } });
  return NextResponse.json({ ok: true });
}
