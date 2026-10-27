import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { usageSummary } from "@/lib/usage";
import { z } from "zod";
const quota = z.number().int().min(0).max(100000).nullable();
const schema = z.object({ id: z.string().min(1), name: z.string().trim().min(1).max(100), disabled: z.boolean(), dailyImages: quota, dailyText: quota, concurrentImages: quota }).strict();
export async function GET(request: Request) {
 if (!await requireAdmin()) return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
 const url = new URL(request.url); const q = (url.searchParams.get("q") ?? "").slice(0,100); const page = Math.max(1, Math.min(100000, Math.floor(Number(url.searchParams.get("page")) || 1)));
 const where = { OR: [{ username: { contains: q, mode: "insensitive" as const } }, { name: { contains: q, mode: "insensitive" as const } }, { email: { contains: q, mode: "insensitive" as const } }] };
 const total = await db.merchant.count({ where });
 const users = await db.merchant.findMany({ where, skip: (page-1)*20, take: 20, orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, username: true, disabled: true, dailyImages: true, dailyText: true, concurrentImages: true, createdAt: true, records: { take: 5, orderBy: { createdAt: "desc" }, select: { id: true, type: true, status: true, createdAt: true } } } });
 return NextResponse.json({ total, users: await Promise.all(users.map(async u => ({ ...u, usage: await usageSummary(u.id) }))) });
}
export async function PATCH(request: Request) {
 const admin = await requireAdmin(); if (!admin) return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
 const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "名称不能为空，额度必须是非负整数" }, { status: 400 });
 const { id, ...data } = parsed.data;
 if (id === admin.merchantId && data.disabled) return NextResponse.json({ error: "不能停用当前管理员" }, { status: 400 });
 const result = await db.merchant.updateMany({ where: { id }, data });
 return NextResponse.json(result.count ? { ok: true } : { error: "用户不存在" }, { status: result.count ? 200 : 404 });
}
