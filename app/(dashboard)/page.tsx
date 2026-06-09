"use client";

import { useState } from "react";
import { FidelitySelector } from "@/components/fidelity-selector";
import { FilePicker } from "@/components/file-picker";
import { PromptEditor } from "@/components/prompt-editor";
import { ResultPanel } from "@/components/result-panel";

export default function WorkbenchPage() {
  const [roomImageUrl, setRoomImageUrl] = useState("");
  const [sampleImageUrl, setSampleImageUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [optimizedPrompt, setOptimizedPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [fidelity, setFidelity] = useState<
    "strict" | "balanced" | "creative"
  >("strict");
  const [imageUrl, setImageUrl] = useState("");
  const [shortVideoScript, setShortVideoScript] = useState("");
  const [socialCopy, setSocialCopy] = useState("");
  const [customerScript, setCustomerScript] = useState("");

  async function optimize() {
    const response = await fetch("/api/ai/optimize-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userPrompt: prompt,
        fidelity,
        materialSummary: "当前选择的窗帘/软装样本",
      }),
    });
    const body = await response.json();
    setOptimizedPrompt(body.optimizedPrompt);
    setNegativePrompt(body.negativePrompt);
  }

  async function generate(referenceImageUrl?: string) {
    const response = await fetch("/api/ai/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomImageUrl,
        sampleImageUrl,
        optimizedPrompt: optimizedPrompt || prompt,
        negativePrompt,
        fidelity,
        referenceImageUrl,
      }),
    });
    const body = await response.json();
    setImageUrl(body.imageUrl);
  }

  async function marketing() {
    const response = await fetch("/api/ai/generate-marketing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        materialSummary: "当前选择的窗帘/软装样本",
        roomSummary: prompt,
        effectImageUrl: imageUrl,
        customerNotes: "",
      }),
    });
    const body = await response.json();
    setShortVideoScript(body.shortVideoScript);
    setSocialCopy(body.socialCopy);
    setCustomerScript(body.customerScript);
  }

  async function savePlan() {
    await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: "临时客户",
        notes: "",
        roomImageUrl,
        sampleImageUrl,
        originalPrompt: prompt,
        optimizedPrompt,
        negativePrompt,
        fidelity,
        materialIds: [],
      }),
    });
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">新建客户方案</h1>
        <p className="mt-1 text-sm text-neutral-500">
          上传房间图和样本图，自主书写提示词后生成效果图。
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <FilePicker
          label="客户房间图"
          value={roomImageUrl}
          onChange={setRoomImageUrl}
        />
        <FilePicker
          label="窗帘/软装样本图"
          value={sampleImageUrl}
          onChange={setSampleImageUrl}
        />
      </div>
      <PromptEditor value={prompt} onChange={setPrompt} />
      <FidelitySelector value={fidelity} onChange={setFidelity} />
      <div className="sticky bottom-14 grid gap-2 bg-neutral-50 py-3 md:static md:grid-cols-2">
        <button
          type="button"
          className="rounded-md border bg-white px-4 py-3"
          onClick={optimize}
        >
          优化提示词
        </button>
        <button
          type="button"
          className="rounded-md bg-neutral-950 px-4 py-3 text-white"
          onClick={() => generate()}
        >
          生成效果图
        </button>
      </div>
      <ResultPanel
        imageUrl={imageUrl}
        shortVideoScript={shortVideoScript}
        socialCopy={socialCopy}
        customerScript={customerScript}
        onSimilar={() => generate(imageUrl)}
        onMarketing={marketing}
        onSave={savePlan}
      />
    </div>
  );
}
