import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { registrationSchema, signIn } from "@/lib/auth/credentials";
import { isAdmin } from "@/lib/auth/admin";
class InvitationUnavailable extends Error {}
export async function POST(request: Request) {
 const parsed = registrationSchema.safeParse(await request.json().catch(() => null));
 if (!parsed.success) return NextResponse.json({ error: "请填写有效邀请码、店铺名称、用户名和至少 8 位密码；邮箱可不填" }, { status: 400 });
 const { name, username, email, password, inviteCode } = parsed.data;
 // Optional, unverified email must never grant administrator access.
 if (email && isAdmin(email)) return NextResponse.json({ error: "该邮箱不可用于新注册，请使用已有账号登录" }, { status: 400 });
 try {
  const passwordHash = await bcrypt.hash(password, 10);
  const createAccount = () => db.$transaction(async tx => {
   const invite = await tx.invitation.findUnique({ where: { code: inviteCode } });
   if (!invite) throw new InvitationUnavailable();
   // Conditional increment serializes concurrent redemptions. A failed account
   // insert rolls back the increment, so duplicate usernames consume no seats.
   const claimed = await tx.invitation.updateMany({ where: { id: invite.id, disabled: false, expiresAt: { gt: new Date() }, usedCount: { lt: invite.maxUses } }, data: { usedCount: { increment: 1 } } });
   if (!claimed.count) throw new InvitationUnavailable();
   return tx.merchant.create({ data: { name, username, email: email || null, passwordHash, onboarded: false, invitationId: invite.id, dailyImages: invite.dailyImages, dailyText: invite.dailyText, concurrentImages: invite.concurrentImages } });
  }, { maxWait: 10000, timeout: 15000 });
  let merchant;
  for (let attempt = 0; ; attempt++) {
   try { merchant = await createAccount(); break; }
   catch (error) {
    if (attempt < 2 && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") continue;
    throw error;
   }
  }
  await signIn({ merchantId: merchant.id, email: merchant.email ?? "" });
  return NextResponse.json({ ok: true }, { status: 201 });
 } catch (error) {
  if (error instanceof InvitationUnavailable) return NextResponse.json({ error: "邀请码无效、已过期、已关闭或名额已用完，请联系邀请人" }, { status: 400 });
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "用户名或邮箱已注册，请换一个或直接登录" }, { status: 409 });
  console.error(JSON.stringify({ event: "trial_registration_failed", code: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : "unknown" }));
  return NextResponse.json({ error: "注册暂时失败，请稍后重试" }, { status: 503 });
 }
}
