"use client";

import { useState } from "react";

const steps = ["房间图", "样本", "要求", "出图"];

const roomPrompt =
  "现代轻奢风格客厅，窗帘采用米色绒布拼接白纱帘，落地款，搭配金色金属轨道。沙发选用浅灰色，搭配米色与墨绿色靠垫，地毯为浅灰色。整体色调温暖明亮，空间通透，细节精致，营造优雅舒适的氛围。";

const promptTags = ["现代简约", "高透光", "米白色", "保留窗户结构"];
const demoRoomImageUrl = "/demo/room-before.jpg";
const demoSampleImageUrl = "/demo/curtain-sample.jpg";
const materialSummary = "米白高遮光绒布窗帘，垂感好，搭配白纱帘和金色轨道";

const samples = [
  "curtain-swatch-a",
  "curtain-swatch-b",
  "curtain-swatch-c",
  "curtain-swatch-d",
];

const fidelityOptions = [
  ["strict", "严格还原", "最大程度还原样本与房间"],
  ["balanced", "平衡", "兼顾还原与整体效果优化"],
  ["creative", "创意参考", "在参考基础上创意设计"],
] as const;

type FlowStep = 0 | 1 | 2 | 3;
type Fidelity = (typeof fidelityOptions)[number][0];

export default function WorkbenchPage() {
  const [activeStep, setActiveStep] = useState<FlowStep>(0);
  const [prompt, setPrompt] = useState(roomPrompt);
  const [optimizedPrompt, setOptimizedPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [fidelity, setFidelity] = useState<Fidelity>("balanced");
  const [imageUrl, setImageUrl] = useState("");
  const [shortVideoScript, setShortVideoScript] = useState("");
  const [socialCopy, setSocialCopy] = useState("");
  const [customerScript, setCustomerScript] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  async function postJson<T>(url: string, body: unknown): Promise<T> {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${url}`);
    }

    return response.json() as Promise<T>;
  }

  async function optimizePrompt() {
    setBusyAction("optimize");
    try {
      const result = await postJson<{
        optimizedPrompt: string;
        negativePrompt: string;
      }>("/api/ai/optimize-prompt", {
        userPrompt: prompt,
        materialSummary,
        fidelity,
      });
      setPrompt(result.optimizedPrompt);
      setOptimizedPrompt(result.optimizedPrompt);
      setNegativePrompt(result.negativePrompt);
    } finally {
      setBusyAction(null);
    }
  }

  async function generateImage(referenceImageUrl?: string) {
    setBusyAction("generate");
    try {
      const result = await postJson<{ imageUrl: string; inputSummary: string }>(
        "/api/ai/generate-image",
        {
          roomImageUrl: demoRoomImageUrl,
          sampleImageUrl: demoSampleImageUrl,
          optimizedPrompt: optimizedPrompt || prompt,
          negativePrompt,
          fidelity,
          referenceImageUrl,
        },
      );
      setImageUrl(result.imageUrl);
      setActiveStep(2);
    } finally {
      setBusyAction(null);
    }
  }

  async function generateMarketing() {
    setBusyAction("marketing");
    try {
      const result = await postJson<{
        shortVideoScript: string;
        socialCopy: string;
        customerScript: string;
      }>("/api/ai/generate-marketing", {
        materialSummary,
        roomSummary: optimizedPrompt || prompt,
        effectImageUrl: imageUrl || demoRoomImageUrl,
        customerNotes: "王女士客厅窗帘方案",
      });
      setShortVideoScript(result.shortVideoScript);
      setSocialCopy(result.socialCopy);
      setCustomerScript(result.customerScript);
    } finally {
      setBusyAction(null);
    }
  }

  async function savePlan() {
    setBusyAction("save");
    try {
      await postJson("/api/plans", {
        customerName: "王女士",
        notes: "客厅窗帘方案",
        roomImageUrl: demoRoomImageUrl,
        sampleImageUrl: demoSampleImageUrl,
        originalPrompt: roomPrompt,
        optimizedPrompt: optimizedPrompt || prompt,
        negativePrompt,
        fidelity,
        primaryImageUrl: imageUrl || demoRoomImageUrl,
        shortVideoScript,
        socialCopy,
        customerScript,
        status: "ready",
        materialIds: [],
      });
      setActiveStep(3);
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="proposal-stage">
      <div className="phone-frame">
        <div className="phone-screen">
          <StatusBar />
          <Header activeStep={activeStep} onStepChange={setActiveStep} />
          <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-24">
            {activeStep === 0 ? (
              <RoomStep onNext={() => setActiveStep(1)} />
            ) : null}
            {activeStep === 1 ? (
              <RequirementStep
                prompt={prompt}
                fidelity={fidelity}
                onPromptChange={setPrompt}
                onFidelityChange={setFidelity}
                busyAction={busyAction}
                onOptimize={optimizePrompt}
                onGenerate={() => generateImage()}
              />
            ) : null}
            {activeStep === 2 ? (
              <ResultStep
                fidelity={fidelity}
                imageUrl={imageUrl}
                shortVideoScript={shortVideoScript}
                socialCopy={socialCopy}
                customerScript={customerScript}
                busyAction={busyAction}
                onSimilar={() => generateImage(imageUrl)}
                onMarketing={generateMarketing}
                onCustomerView={savePlan}
              />
            ) : null}
            {activeStep === 3 ? (
              <CustomerStep socialCopy={socialCopy} customerScript={customerScript} />
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}

function StatusBar() {
  return (
    <div className="flex h-9 shrink-0 items-end justify-between px-7 pb-1 text-[13px] font-semibold text-neutral-950">
      <span>10:32</span>
      <div className="flex items-center gap-1.5 text-[11px]">
        <span>▮▮▮</span>
        <span>WiFi</span>
        <span className="inline-flex h-2.5 w-5 rounded-sm border border-neutral-900 p-0.5">
          <span className="h-full w-3 rounded-[1px] bg-neutral-900" />
        </span>
      </div>
    </div>
  );
}

function Header({
  activeStep,
  onStepChange,
}: {
  activeStep: FlowStep;
  onStepChange: (step: FlowStep) => void;
}) {
  const titles = ["新建客户方案", "生成要求", "生成结果", "客户展示"];

  return (
    <header className="shrink-0 border-b border-neutral-100 bg-white px-4 pb-3">
      <div className="grid h-11 grid-cols-[40px_1fr_72px] items-center">
        <button
          type="button"
          className="flex size-9 items-center justify-start text-3xl font-light leading-none text-neutral-900"
          aria-label="返回"
          onClick={() => onStepChange(activeStep > 0 ? ((activeStep - 1) as FlowStep) : 0)}
        >
          ‹
        </button>
        <div className="min-w-0 text-center">
          <h1 className="truncate text-[17px] font-semibold text-neutral-950">
            {titles[activeStep]}
          </h1>
          {activeStep === 0 ? (
            <p className="mt-1 truncate text-[13px] text-neutral-500">
              王女士 · 客厅窗帘方案
              <span aria-hidden="true">⌄</span>
            </p>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 text-[13px] text-neutral-600">
          {activeStep === 1 ? (
            <button type="button" className="font-medium text-neutral-700">
              模板
            </button>
          ) : null}
          {activeStep === 2 ? (
            <button type="button" className="font-medium text-neutral-600">
              重新生成
            </button>
          ) : null}
          {activeStep === 3 ? (
            <button type="button" className="font-medium text-neutral-600">
              编辑
            </button>
          ) : null}
          {activeStep === 0 ? (
            <>
              <button type="button" aria-label="文档" className="text-lg">
                ▧
              </button>
              <button type="button" aria-label="更多" className="text-xl">
                ⋯
              </button>
            </>
          ) : null}
        </div>
      </div>

      {activeStep === 0 ? (
        <ol className="mt-3 grid grid-cols-4 items-start">
          {steps.map((step, index) => (
            <li key={step} className="relative text-center">
              {index > 0 ? (
                <span className="absolute left-[-50%] top-[13px] h-px w-full bg-neutral-200" />
              ) : null}
              <span
                className={`relative z-10 mx-auto flex size-7 items-center justify-center rounded-full border text-[13px] ${
                  index === 0
                    ? "border-[#257b74] bg-[#257b74] text-white"
                    : "border-neutral-200 bg-white text-neutral-500"
                }`}
              >
                {index + 1}
              </span>
              <span className="mt-2 block text-[12px] text-neutral-600">
                {step}
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      {activeStep === 3 ? (
        <div className="mt-2 grid grid-cols-2 border-b border-neutral-100 text-center text-[14px] font-medium">
          <span className="border-b-2 border-[#257b74] pb-3 text-neutral-950">
            方案效果
          </span>
          <span className="pb-3 text-neutral-500">方案详情</span>
        </div>
      ) : null}
    </header>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-neutral-100 bg-white shadow-[0_8px_28px_rgba(31,41,55,0.06)] ${className}`}
    >
      {children}
    </section>
  );
}

function RoomStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-3 pt-3">
      <Card className="overflow-hidden p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">客户房间图</h2>
          <button type="button" className="text-[12px] text-neutral-500">
            ▧ 示例
          </button>
        </div>
        <RoomScene variant="empty" />
        <div className="mt-3 grid grid-cols-2 divide-x divide-neutral-100 text-center text-[13px] text-neutral-700">
          <button type="button" className="py-1.5">
            ⭱ 重新上传
          </button>
          <button type="button" className="py-1.5">
            ▧ 更换房间图
          </button>
        </div>
      </Card>

      <Card className="p-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">窗帘/软装样本</h2>
          <span className="text-[12px] text-neutral-500">4/6</span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {samples.map((sample, index) => (
            <button
              key={sample}
              type="button"
              aria-label={`样本 ${index + 1}`}
              className={`aspect-square rounded-lg border border-neutral-100 ${sample}`}
            />
          ))}
          <button
            type="button"
            aria-label="添加样本"
            className="aspect-square rounded-lg border border-neutral-200 bg-neutral-50 text-3xl font-light text-neutral-600"
          >
            +
          </button>
        </div>
      </Card>

      <Card className="overflow-hidden p-3">
        <h2 className="mb-3 text-[15px] font-semibold">待生成效果</h2>
        <div className="relative overflow-hidden rounded-lg">
          <RoomScene variant="preview" />
          <div className="absolute inset-0 grid place-items-center bg-black/18 text-center text-[13px] font-medium leading-6 text-white">
            生成后将在此处显示效果图
            <br />
            支持多次生成对比
          </div>
          <span className="absolute left-3 top-3 grid size-8 place-items-center rounded-full bg-white/86 text-lg text-neutral-700">
            ↓
          </span>
        </div>
      </Card>

      <BottomActions>
        <button type="button" className="secondary-action" aria-label="保存草稿">
          <span aria-hidden="true">▧ </span>
          保存草稿
        </button>
        <button type="button" className="primary-action" onClick={onNext}>
          下一步：生成要求
        </button>
      </BottomActions>
    </div>
  );
}

function RequirementStep({
  prompt,
  fidelity,
  onPromptChange,
  onFidelityChange,
  busyAction,
  onOptimize,
  onGenerate,
}: {
  prompt: string;
  fidelity: Fidelity;
  onPromptChange: (value: string) => void;
  onFidelityChange: (value: Fidelity) => void;
  busyAction: string | null;
  onOptimize: () => void;
  onGenerate: () => void;
}) {
  return (
    <div className="space-y-3 pt-3">
      <Card className="p-3">
        <div className="mb-3 text-[16px] font-semibold">生成要求</div>
        <textarea
          aria-label="生成要求"
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          className="min-h-48 w-full resize-none rounded-lg border border-neutral-200 bg-white p-3 text-[14px] leading-7 text-neutral-700 outline-none focus:border-[#257b74] focus:ring-2 focus:ring-[#dcefeb]"
          maxLength={800}
        />
        <div className="mt-2 text-right text-[12px] text-neutral-400">
          {prompt.length}/800
        </div>
        <button
          type="button"
          className="mt-2 flex w-full items-center justify-between text-[13px] text-neutral-600"
        >
          <span>从提示词库选择</span>
          <span>⌄</span>
        </button>
        <div className="mt-3 flex flex-wrap gap-2">
          {promptTags.map((tag) => (
            <button
              key={tag}
              type="button"
              className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-[13px] text-neutral-700"
            >
              {tag}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-3">
        <div className="mb-3 flex items-center gap-1">
          <h2 className="text-[16px] font-semibold">还原度设置</h2>
          <span className="text-[12px] text-neutral-400">ⓘ</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {fidelityOptions.map(([value, label, description]) => (
            <button
              key={value}
              type="button"
              onClick={() => onFidelityChange(value)}
              className={`min-h-20 rounded-lg border p-2 text-center ${
                fidelity === value
                  ? "border-[#257b74] bg-[#eef8f6] text-[#1f6f68]"
                  : "border-neutral-200 bg-white text-neutral-800"
              }`}
            >
              <span className="block text-[14px] font-semibold">{label}</span>
              <span className="mt-1 block text-[11px] leading-5 text-neutral-500">
                {description}
              </span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-3">
        <h2 className="mb-3 text-[15px] font-semibold">其他要求（可选）</h2>
        <textarea
          aria-label="其他要求"
          placeholder="如不添加，则将优化为更自然的效果"
          className="min-h-20 w-full resize-none rounded-lg border border-neutral-200 p-3 text-[13px] outline-none"
          maxLength={200}
        />
        <div className="mt-2 text-right text-[12px] text-neutral-400">0/200</div>
      </Card>

      <BottomActions>
        <button
          type="button"
          className="secondary-action"
          aria-label="优化提示词"
          disabled={busyAction === "optimize"}
          onClick={onOptimize}
        >
          <span aria-hidden="true">✧ </span>
          {busyAction === "optimize" ? "优化中" : "优化提示词"}
        </button>
        <button
          type="button"
          className="primary-action"
          aria-label="生成效果图"
          disabled={busyAction === "generate"}
          onClick={onGenerate}
        >
          <span aria-hidden="true">✦ </span>
          {busyAction === "generate" ? "生成中" : "生成效果图"}
        </button>
      </BottomActions>
    </div>
  );
}

function ResultStep({
  fidelity,
  imageUrl,
  shortVideoScript,
  socialCopy,
  customerScript,
  busyAction,
  onSimilar,
  onMarketing,
  onCustomerView,
}: {
  fidelity: Fidelity;
  imageUrl: string;
  shortVideoScript: string;
  socialCopy: string;
  customerScript: string;
  busyAction: string | null;
  onSimilar: () => void;
  onMarketing: () => void;
  onCustomerView: () => void;
}) {
  const fidelityLabel =
    fidelityOptions.find(([value]) => value === fidelity)?.[1] ?? "平衡";

  return (
    <div className="space-y-3 pt-3">
      <div className="relative overflow-hidden rounded-xl">
        <span className="absolute left-3 top-3 z-10 rounded-md bg-[#df7654] px-2.5 py-1.5 text-[12px] font-semibold text-white">
          最新生成
        </span>
        <RoomScene variant="result" />
        <span className="absolute bottom-3 left-3 rounded-md bg-black/45 px-2 py-1 text-[12px] text-white">
          1/2
        </span>
        <button
          type="button"
          className="absolute bottom-3 right-3 rounded-md bg-white px-3 py-2 text-[13px] font-medium text-neutral-800 shadow"
        >
          ⇄ 对比原图
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {["相似方案", "营销内容", "保存方案"].map((label) => (
          <button
            key={label}
            type="button"
            className="rounded-lg border border-neutral-100 bg-white px-2 py-3 text-[13px] text-neutral-700 shadow-[0_5px_18px_rgba(31,41,55,0.04)]"
            disabled={
              (label === "相似方案" && busyAction === "generate") ||
              (label === "营销内容" && busyAction === "marketing") ||
              (label === "保存方案" && busyAction === "save")
            }
            onClick={
              label === "保存方案"
                ? onCustomerView
                : label === "营销内容"
                  ? onMarketing
                  : onSimilar
            }
          >
            {label === "营销内容" && busyAction === "marketing"
              ? "生成中"
              : label === "保存方案" && busyAction === "save"
                ? "保存中"
                : label}
          </button>
        ))}
      </div>

      <Card className="p-3">
        <h2 className="border-b border-neutral-100 pb-3 text-[15px] font-semibold">
          本次生成条件
        </h2>
        <ul className="space-y-2 pt-3 text-[13px] text-neutral-600">
          <li>◎ 房间结构：已保留</li>
          <li>◎ 样本色彩：平衡处理</li>
          <li>◎ 还原度：{fidelityLabel}模式</li>
          <li>◎ 效果图：{imageUrl || "本地预览图"}</li>
        </ul>
      </Card>
      {shortVideoScript || socialCopy || customerScript ? (
        <Card className="space-y-3 p-3">
          <h2 className="text-[15px] font-semibold">营销内容</h2>
          {shortVideoScript ? (
            <p className="text-[13px] leading-6 text-neutral-700">
              {shortVideoScript}
            </p>
          ) : null}
          {socialCopy ? (
            <p className="text-[13px] leading-6 text-neutral-700">
              {socialCopy}
            </p>
          ) : null}
          {customerScript ? (
            <p className="text-[13px] leading-6 text-neutral-700">
              {customerScript}
            </p>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}

function CustomerStep({
  socialCopy,
  customerScript,
}: {
  socialCopy: string;
  customerScript: string;
}) {
  return (
    <div className="space-y-3 pt-3">
      <RoomScene variant="customer" />

      <CopyCard
        title="朋友圈文案"
        body={
          socialCopy || (
            <>
            温柔米色，治愈每一天的生活气息。
            <br />
            轻奢质感窗帘搭配，让家更有温度与格调。
            </>
          )
        }
      />
      <CopyCard
        title="客户沟通话术"
        body={
          customerScript || (
            <>
            这套方案以米色为主调，搭配白色纱帘，空间更通透明亮；
            绒布面料垂感细腻，遮光效果出色，搭配金色轨道，提升整体精致感。
            软装色彩协调，营造出温馨舒适的居家氛围。
            </>
          )
        }
      />

      <div className="grid grid-cols-3 gap-2 rounded-xl border border-neutral-100 bg-white p-2 text-[12px] text-neutral-700">
        <button type="button" className="py-2">
          分享方案
        </button>
        <button type="button" className="py-2">
          保存图片
        </button>
        <button type="button" className="py-2">
          生成海报
        </button>
      </div>

      <BottomActions>
        <button
          type="button"
          className="primary-action col-span-2"
          aria-label="分享给客户"
        >
          <span aria-hidden="true">☏ </span>
          分享给客户
        </button>
      </BottomActions>
    </div>
  );
}

function CopyCard({
  title,
  body,
}: {
  title: string;
  body: React.ReactNode;
}) {
  return (
    <Card className="p-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        <button type="button" className="text-[12px] text-neutral-500">
          ▧ 复制
        </button>
      </div>
      <p className="text-[13px] leading-6 text-neutral-700">{body}</p>
    </Card>
  );
}

function BottomActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 grid grid-cols-2 gap-2 border-t border-neutral-100 bg-white/95 px-4 pb-4 pt-3 backdrop-blur">
      {children}
    </div>
  );
}

function RoomScene({
  variant,
}: {
  variant: "empty" | "preview" | "result" | "customer";
}) {
  const isEmpty = variant === "empty";
  const isTall = variant === "result";

  return (
    <div
      className={`room-scene ${isEmpty ? "room-scene-empty" : ""} ${
        isTall ? "aspect-[4/5]" : "aspect-[16/10]"
      }`}
    >
      <div className="room-ceiling" />
      <div className="room-window">
        {!isEmpty ? (
          <>
            <div className="curtain curtain-left" />
            <div className="curtain curtain-right" />
            <div className="sheer" />
          </>
        ) : null}
        <div className="window-pane" />
      </div>
      {!isEmpty ? (
        <>
          <div className="plant" />
          <div className="sofa" />
          <div className="table" />
          <div className="lamp" />
          <div className="art" />
        </>
      ) : null}
      <div className="floor" />
    </div>
  );
}
