"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function WelcomeGuide() {
  const router = useRouter(); const [pending, setPending] = useState(false); const [error, setError] = useState("");
  async function start() {
    setPending(true); setError("");
    try { const r = await fetch("/api/auth/welcome", { method: "POST" }); if (!r.ok) throw new Error("暂时无法开始，请重试"); router.replace("/"); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "请重试"); } finally { setPending(false); }
  }
  return <main className="mx-auto max-w-2xl space-y-6 p-8">
    <h1 className="text-2xl font-semibold">先做一份窗帘搭配方案</h1>
    <p className="text-stone-600">工作台已放入示例图。你也可以换成客户的房间与店里的窗帘样本。</p>
    <ol className="space-y-4 leading-7">
      <li><strong>1. 准备三张图：</strong>房间全景、完整窗帘款式、面料近照。JPG、PNG 或 WebP，单张不超过 4MB。</li>
      <li><strong>2. 写清要求：</strong>说明窗帘、颜色与层次，可以先识别图片，再润色要求。</li>
      <li><strong>3. 查看效果：</strong>提交后显示进度，刷新页面可以继续查看；比较效果，再生成营销文案。</li>
      <li><strong>4. 交付客户：</strong>保存到客户名下，打开方案检查内容，再创建客户分享链接。分享页提供打印或保存为 PDF。</li>
    </ol>
    <p className="text-sm text-stone-500">效果图用于搭配沟通，实际颜色、尺寸与安装效果请结合样本确认。额度可在“用量”页面查看。</p>
    {error && <p role="alert" className="text-red-600">{error}</p>}
    <button onClick={start} disabled={pending} className="rounded-lg bg-sage px-6 py-3 text-white">{pending ? "正在进入..." : "开始制作方案"}</button>
  </main>;
}
