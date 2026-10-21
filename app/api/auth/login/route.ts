import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { credentialsSchema, signIn } from "@/lib/auth/credentials";
export async function POST(request: Request) {
  const parsed = credentialsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "请填写有效邮箱和密码" }, { status: 400 });
  const merchant = await db.merchant.findUnique({ where: { email: parsed.data.email } });
  if (!merchant || merchant.disabled || !(await bcrypt.compare(parsed.data.password, merchant.passwordHash))) return NextResponse.json({ error: "邮箱或密码不正确" }, { status: 401 });
  await signIn({ merchantId: merchant.id, email: merchant.email });
  return NextResponse.json({ ok: true, needsWelcome: !merchant.onboarded });
}
