"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function onSubmit(formData: FormData) {
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });

    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "登录失败");
      return;
    }

    router.push("/");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <h1 className="text-2xl font-semibold text-neutral-950">
        软装商家工作台
      </h1>
      <p className="mt-2 text-sm text-neutral-600">
        使用演示账号 demo@example.com / demo123456 登录。
      </p>
      <form action={onSubmit} className="mt-8 space-y-4">
        <input
          name="email"
          type="email"
          defaultValue="demo@example.com"
          className="w-full rounded-md border px-3 py-3"
        />
        <input
          name="password"
          type="password"
          defaultValue="demo123456"
          className="w-full rounded-md border px-3 py-3"
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button className="w-full rounded-md bg-neutral-950 px-4 py-3 text-white">
          登录
        </button>
      </form>
    </main>
  );
}
