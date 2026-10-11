import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { registrationSchema, signIn } from "@/lib/auth/credentials";
export async function POST(request: Request) {
  const parsed = registrationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "请填写店铺名称、有效邮箱和至少 8 位密码" }, { status: 400 });
  const { name, email, password } = parsed.data;
  try {
    const merchant = await db.merchant.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 10), onboarded: false } });
    await signIn({ merchantId: merchant.id, email: merchant.email });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "这个邮箱已注册，请直接登录" }, { status: 409 });
    return NextResponse.json({ error: "注册暂时失败，请稍后重试" }, { status: 503 });
  }
}
