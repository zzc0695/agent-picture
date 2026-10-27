import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { invitationSchema, invitationUpdateSchema } from "@/lib/auth/invitations";
export async function POST(request: Request) {
 const admin = await requireAdmin();
 if (!admin) return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
 const parsed = invitationSchema.safeParse(await request.json().catch(() => null));
 if (!parsed.success) return NextResponse.json({ error: "请填写邀请名称、1–1000 个名额、1–90 天有效期和正整数额度" }, { status: 400 });
 const { validDays, ...data } = parsed.data;
 const invitation = await db.invitation.create({ data: { ...data, code: randomBytes(12).toString("hex").toUpperCase(), expiresAt: new Date(Date.now() + validDays * 86400000), createdById: admin.merchantId } });
 return NextResponse.json({ id: invitation.id, code: invitation.code }, { status: 201 });
}
export async function PATCH(request: Request) {
 if (!await requireAdmin()) return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
 const parsed = invitationUpdateSchema.safeParse(await request.json().catch(() => null));
 if (!parsed.success) return NextResponse.json({ error: "邀请设置无效" }, { status: 400 });
 const result = await db.invitation.updateMany({ where: { id: parsed.data.id }, data: { disabled: parsed.data.disabled } });
 return NextResponse.json(result.count ? { ok: true } : { error: "邀请不存在" }, { status: result.count ? 200 : 404 });
}
