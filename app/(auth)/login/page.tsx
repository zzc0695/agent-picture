"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const formData = new FormData(event.currentTarget);
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(formData.get("email") ?? "").trim(),
          password: formData.get("password"),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "登录服务暂时不可用，请稍后重试");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("网络连接失败，请检查网络后重试");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5">
      <h1 className="text-2xl font-semibold text-neutral-950">
        软装商家工作台
      </h1>
      <p className="mt-3 text-sm leading-6 text-neutral-600">上传房间与材质参考图，生成窗帘效果图和营销文案，并保存客户方案。</p>
      <p className="mt-2 text-sm text-neutral-600">
        使用演示账号 demo@example.com / demo123456 登录。
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label htmlFor="email" className="block text-sm font-medium">邮箱</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          disabled={pending}
          defaultValue="demo@example.com"
          className="w-full rounded-md border px-3 py-3"
        />
        <label htmlFor="password" className="block text-sm font-medium">密码</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
          defaultValue="demo123456"
          className="w-full rounded-md border px-3 py-3"
        />
        {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
        <button disabled={pending} className="w-full rounded-md bg-neutral-950 px-4 py-3 text-white">
          {pending ? "登录中..." : "登录"}
        </button>
      </form>
    </main>
  );
}
