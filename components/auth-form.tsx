"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
export function AuthForm({ register = false }: { register?: boolean }) {
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
    <h1 className="mt-5 text-2xl font-semibold text-stone-900">{register ? "创建商家账号" : "软装商家工作台"}</h1>
    <p className="mt-3 text-sm leading-6 text-stone-600">用客户房间和自家款式、面料制作窗帘方案。</p>
    <form onSubmit={submit} className="auth-form mt-8 space-y-4">
      {register && <><label htmlFor="name" className="block text-sm">店铺名称</label><input id="name" name="name" maxLength={80} required disabled={pending} className="w-full rounded-md border p-3" /></>}
      <label htmlFor="email" className="block text-sm">邮箱</label><input id="email" name="email" type="email" autoComplete="username" required disabled={pending} className="w-full rounded-md border p-3" />
      <label htmlFor="password" className="block text-sm">密码</label><input id="password" name="password" type="password" autoComplete={register ? "new-password" : "current-password"} minLength={register ? 8 : undefined} maxLength={72} required disabled={pending} className="w-full rounded-md border p-3" />
      {register && <p className="text-xs text-stone-500">至少 8 位。注册后即可开始制作方案。</p>}
      {!register && <p className="text-xs text-stone-500">登录后在此浏览器保持 30 天，无需每天重新登录。</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button disabled={pending} className="studio-primary-button w-full p-3">{pending ? (register ? "注册中..." : "登录中...") : (register ? "注册并开始使用" : "登录")}</button>
    </form>
    <Link href={register ? "/login" : "/register"} className="mt-5 inline-block text-sm text-sage underline">{register ? "已有账号，去登录" : "还没有账号？注册"}</Link>
  </section></main>;
}
