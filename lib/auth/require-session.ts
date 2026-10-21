import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { MerchantSession } from "@/lib/auth/session";
import { readSessionToken, sessionCookieName } from "@/lib/auth/session";

export async function getMerchantSession(): Promise<MerchantSession | null> {
  const jar = await cookies();
  const session = await readSessionToken(jar.get(sessionCookieName)?.value);
  if (!session) return null;
  const merchant = await db.merchant.findUnique({ where: { id: session.merchantId } });
  return merchant && !merchant.disabled ? { ...session, email: merchant.email } : null;
}

export async function requireMerchantSession() {
  const session = await getMerchantSession();
  return session;
}

export async function requirePageMerchantSession() {
  const session = await getMerchantSession();
  if (!session) {
    redirect("/login");
  }

  return session;
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "请先登录" }, { status: 401 });
}
