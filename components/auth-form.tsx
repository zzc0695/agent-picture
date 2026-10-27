"use client";
import { Input } from "@/components/ui/input";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
export function AuthForm({ register = false, inviteCode = "" }: { register?: boolean; inviteCode?: string }) {
  const router = useRouter(); const [pending, setPending] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;
    const form = new FormData(event.currentTarget); setPending(true); setError("");
    try {
      const response = await fetch(`/api/auth/${register ? "register" : "login"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(data.error || "服务暂时不可用，请稍后重试"); return; }
      localStorage.removeItem("image-generation-job");
      localStorage.removeItem("last-image-result");
      router.replace(register || data.needsWelcome ? "/welcome" : "/"); router.refresh();
    } catch { setError("网络连接失败，请检查网络后重试"); } finally { setPending(false); }
  }
  return <main className="auth-page"><section className="auth-card">
    <p className="text-sm font-semibold tracking-wide text-sage">AI 软装</p>
    <h1 className="mt-5 text-2xl font-semibold text-stone-900">{register ? "加入商家试用" : "软装商家工作台"}</h1>
    <p className="mt-3 text-sm leading-6 text-stone-600">用客户房间和自家款式、面料制作窗帘方案。</p>
    <form onSubmit={submit} className="auth-form mt-8 space-y-4">
      {register && <><label htmlFor="name" className="block text-sm">店铺名称</label><Input id="name" name="name" maxLength={80} required disabled={pending} className="w-full rounded-md border p-3" /></>}
      {register ? <>
       <label htmlFor="inviteCode" className="block text-sm">邀请码</label><Input id="inviteCode" name="inviteCode" defaultValue={inviteCode} maxLength={24} required disabled={pending} autoComplete="off" className="w-full rounded-md border p-3" />
       <label htmlFor="username" className="block text-sm">用户名</label><Input id="username" name="username" autoComplete="username" minLength={3} maxLength={32} pattern="[a-zA-Z][a-zA-Z0-9_]{2,31}" required disabled={pending} className="w-full rounded-md border p-3" />
       <p className="text-xs text-stone-500">3–32 位字母、数字或下划线，以字母开头；登录时使用，不区分大小写。</p>
       <details><summary className="cursor-pointer text-sm text-stone-500">选填邮箱</summary><label htmlFor="email" className="mt-3 block text-sm">邮箱（选填）</label><Input id="email" name="email" type="email" autoComplete="email" maxLength={254} disabled={pending} className="mt-2 w-full rounded-md border p-3" /></details>
      </> : <><label htmlFor="email" className="block text-sm">用户名或邮箱</label><Input id="email" name="email" type="text" autoComplete="username" maxLength={254} required disabled={pending} className="w-full rounded-md border p-3" /></>}
      <label htmlFor="password" className="block text-sm">密码</label><Input id="password" name="password" type="password" autoComplete={register ? "new-password" : "current-password"} minLength={register ? 8 : undefined} maxLength={72} required disabled={pending} className="w-full rounded-md border p-3" />
      {register && <p className="text-xs text-stone-500">密码至少 8 位，请记住用户名和密码。没有邀请码或忘记密码时，请联系邀请你试用的人。</p>}
      {!register && <p className="text-xs text-stone-500">登录后在此浏览器保持 30 天，无需每天重新登录。</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending} aria-busy={pending} className="w-full">{pending ? (register ? "注册中..." : "登录中...") : (register ? "注册并开始使用" : "登录")}</Button>
    </form>
    <Link href={register ? "/login" : "/register"} className="mt-5 inline-block text-sm text-sage underline">{register ? "已有账号，去登录" : "有邀请码？加入试用"}</Link>
  </section></main>;
}
