"use client";

/* eslint-disable @next/next/no-img-element */

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  ChevronLeft,
  Copy,
  Download,
  Focus,
  Image as ImageIcon,
  LayoutGrid,
  LayoutTemplate,
  MoreHorizontal,
  MoveRight,
  Plus,
  Quote,
  RefreshCw,
  Scale,
  Share2,
  SlidersHorizontal,
  Sparkles,
  UploadCloud,
  Wand2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const customerName = "王女士";
const planName = "客厅";

const roomPrompt =
  "现代轻奢风格客厅，窗帘采用米色绒布拼接白色纱帘，落地款，搭配金色金属轨道。\n\n沙发选用浅灰色，搭配米色与墨绿色靠垫。\n\n整体氛围要求温暖、明亮并且具有精致的纹理感，灯光柔和。";

const promptTags = ["现代极简", "高遮光度", "奶油暖白", "保留窗户结构"];
const promptTemplates = [
  {
    title: "客厅现代简约窗帘",
    category: "房间风格",
    body: "保留客厅原有结构、窗户位置和透视角度，为窗户安装现代简约风格窗帘，强调自然垂感、真实布料纹理、柔和室内光线，整体干净高级。",
  },
  {
    title: "高遮光温馨卧室",
    category: "窗帘卖点",
    body: "保留卧室原始布局和窗户位置，搭配高遮光米白窗帘，突出厚实面料、柔和褶皱、安静舒适的睡眠氛围，画面保持真实摄影质感。",
  },
  {
    title: "轻奢客户沟通方案",
    category: "营销用途",
    body: "保持房间透视和光线方向，为窗户搭配轻奢质感窗帘，突出垂感、色彩协调和空间升级效果，适合给客户展示成交前方案。",
  },
];

const materialSummary = "米白高遮光绒布窗帘，垂感好，搭配白纱帘和金色轨道";
const demoRoomImageUrl =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=85";
const demoSampleImageUrl =
  "https://images.unsplash.com/photo-1583847268964-b28e50bc78d3?auto=format&fit=crop&w=800&q=85";
const demoDetailImageUrl =
  "https://images.unsplash.com/photo-1596484552834-58eb4ea79eb6?auto=format&fit=crop&w=800&q=85";

const IMAGES = {
  room: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
  fabric1: "https://images.unsplash.com/photo-1583847268964-b28e50bc78d3?auto=format&fit=crop&w=200&q=80",
  fabric2: "https://images.unsplash.com/photo-1563298723-dcfebaa392e3?auto=format&fit=crop&w=200&q=80",
  fabric3: "https://images.unsplash.com/photo-1596484552834-58eb4ea79eb6?auto=format&fit=crop&w=200&q=80",
  hardware: "https://images.unsplash.com/photo-1610824771380-390c72f79f11?auto=format&fit=crop&w=200&q=80",
  result: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80",
};

function isRenderableImageUrl(url: string) {
  return (
    Boolean(url) &&
    !url.startsWith("/demo/") &&
    url !== "/sample-material.jpg"
  );
}

const fidelityOptions = [
  ["strict", "严格", "精确匹配", Focus],
  ["balanced", "平衡", "自然融合", Scale],
  ["creative", "创意", "发散灵感", Sparkles],
] as const satisfies readonly (readonly [
  string,
  string,
  string,
  LucideIcon,
])[];

type FlowStep = 0 | 1 | 2 | 3;
type Fidelity = "strict" | "balanced" | "creative";
type CustomerTab = "effect" | "details";
type MaterialAnalysis = {
  roomSummary: string;
  styleSummary: string;
  materialSummary: string;
  templatePrompt: string;
};

const pageEase = [0.22, 1, 0.36, 1] as [number, number, number, number];

const pageTransition = {
  initial: { opacity: 0, y: 15, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: {
    opacity: 0,
    y: -15,
    filter: "blur(4px)",
    transition: { duration: 0.2 },
  },
  transition: { duration: 0.5, ease: pageEase },
};

export default function WorkbenchPage() {
  const [activeStep, setActiveStep] = useState<FlowStep>(0);
  const [prompt, setPrompt] = useState(roomPrompt);
  const [optimizedPrompt, setOptimizedPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [fidelity, setFidelity] = useState<Fidelity>("balanced");
  const [roomImageUrl, setRoomImageUrl] = useState(demoRoomImageUrl);
  const [styleImageUrl, setStyleImageUrl] = useState(demoSampleImageUrl);
  const [detailImageUrl, setDetailImageUrl] = useState(demoDetailImageUrl);
  const [imageAnalysis, setImageAnalysis] = useState<MaterialAnalysis | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [shortVideoScript, setShortVideoScript] = useState("");
  const [socialCopy, setSocialCopy] = useState("");
  const [customerScript, setCustomerScript] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [analysisError, setAnalysisError] = useState("");
  const [promptLibraryOpen, setPromptLibraryOpen] = useState(false);
  const [customerTab, setCustomerTab] = useState<CustomerTab>("effect");
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof frameRef.current?.scrollTo === "function") {
      frameRef.current.scrollTo({ top: 0 });
    }
  }, [activeStep, customerTab]);

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
        materialSummary: imageAnalysis
          ? `${imageAnalysis.styleSummary}；${imageAnalysis.materialSummary}`
          : materialSummary,
        fidelity,
      });
      setPrompt(result.optimizedPrompt);
      setOptimizedPrompt(result.optimizedPrompt);
      setNegativePrompt(result.negativePrompt);
    } finally {
      setBusyAction(null);
    }
  }

  async function uploadImage(file: File, target: "room" | "style" | "detail") {
    setBusyAction(`upload-${target}`);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !result.url) {
        throw new Error(result.error || "图片上传失败，请稍后重试");
      }

      if (target === "room") {
        setRoomImageUrl(result.url);
      } else if (target === "style") {
        setStyleImageUrl(result.url);
      } else {
        setDetailImageUrl(result.url);
      }
      setImageAnalysis(null);
      setAnalysisError("");
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "图片上传失败，请稍后重试",
      );
    } finally {
      setBusyAction(null);
    }
  }

  function removeImage(target: "room" | "style" | "detail") {
    if (target === "room") setRoomImageUrl("");
    if (target === "style") setStyleImageUrl("");
    if (target === "detail") setDetailImageUrl("");
    setImageAnalysis(null);
    setAnalysisError("");
  }

  async function analyzeUploadedImages() {
    setBusyAction("analyze");
    setAnalysisError("");
    try {
      const result = await postJson<MaterialAnalysis>(
        "/api/ai/analyze-materials",
        { roomImageUrl, styleImageUrl, detailImageUrl },
      );
      setImageAnalysis(result);
      setPrompt(result.templatePrompt);
      setOptimizedPrompt("");
      setNegativePrompt("");
      setActiveStep(1);
    } catch (error) {
      setAnalysisError(
        error instanceof Error ? error.message : "图片识别失败，请重试",
      );
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
          roomImageUrl,
          styleImageUrl,
          detailImageUrl,
          optimizedPrompt: optimizedPrompt || prompt,
          negativePrompt,
          fidelity,
          imageAnalysis: imageAnalysis ? JSON.stringify(imageAnalysis) : "",
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
        materialSummary: imageAnalysis
          ? `${imageAnalysis.styleSummary}；${imageAnalysis.materialSummary}`
          : materialSummary,
        roomSummary: optimizedPrompt || prompt,
        effectImageUrl: imageUrl || roomImageUrl,
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
        roomImageUrl,
        sampleImageUrl: styleImageUrl,
        styleImageUrl,
        detailImageUrl,
        imageAnalysis: imageAnalysis ? JSON.stringify(imageAnalysis) : "{}",
        originalPrompt: roomPrompt,
        optimizedPrompt: optimizedPrompt || prompt,
        negativePrompt,
        fidelity,
        primaryImageUrl: imageUrl || roomImageUrl,
        shortVideoScript,
        socialCopy,
        customerScript,
        status: "ready",
        materialIds: [],
      });
      setCustomerTab("effect");
      setActiveStep(3);
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="studio-page flex min-h-[calc(100dvh-58px)] items-center justify-center">
      <div ref={frameRef} className="mobile-studio-frame">
        <div className="relative h-full min-h-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {activeStep === 0 ? (
              <PageWrapper id="editor">
                <EditorView
                  roomImageUrl={roomImageUrl}
                  styleImageUrl={styleImageUrl}
                  detailImageUrl={detailImageUrl}
                  imageAnalysis={imageAnalysis}
                  busyAction={busyAction}
                  uploadError={uploadError}
                  analysisError={analysisError}
                  onBack={() => undefined}
                  onNext={() => setActiveStep(1)}
                  onUploadRoom={(file) => uploadImage(file, "room")}
                  onUploadStyle={(file) => uploadImage(file, "style")}
                  onUploadDetail={(file) => uploadImage(file, "detail")}
                  onRemoveRoom={() => removeImage("room")}
                  onRemoveStyle={() => removeImage("style")}
                  onRemoveDetail={() => removeImage("detail")}
                  onAnalyze={analyzeUploadedImages}
                />
              </PageWrapper>
            ) : null}
            {activeStep === 1 ? (
              <PageWrapper id="requirements">
                <RequirementsView
                  prompt={prompt}
                  fidelity={fidelity}
                  busyAction={busyAction}
                  onBack={() => setActiveStep(0)}
                  onPromptChange={setPrompt}
                  onFidelityChange={setFidelity}
                  onOpenPromptLibrary={() => setPromptLibraryOpen(true)}
                  onOptimize={optimizePrompt}
                  onNext={() => generateImage()}
                />
              </PageWrapper>
            ) : null}
            {activeStep === 2 ? (
              <PageWrapper id="result">
                <ResultView
                  imageUrl={imageUrl}
                  shortVideoScript={shortVideoScript}
                  socialCopy={socialCopy}
                  customerScript={customerScript}
                  busyAction={busyAction}
                  onBack={() => setActiveStep(1)}
                  onSimilar={() => generateImage(imageUrl)}
                  onMarketing={generateMarketing}
                  onNext={savePlan}
                />
              </PageWrapper>
            ) : null}
            {activeStep === 3 ? (
              <PageWrapper id="display">
                <DisplayView
                  customerTab={customerTab}
                  fidelity={fidelity}
                  imageUrl={imageUrl}
                  socialCopy={socialCopy}
                  customerScript={customerScript}
                  onBack={() => setActiveStep(2)}
                  onCustomerTabChange={setCustomerTab}
                />
              </PageWrapper>
            ) : null}
          </AnimatePresence>

          {promptLibraryOpen ? (
            <PromptLibrarySheet
              onClose={() => setPromptLibraryOpen(false)}
              onInsert={(body) => {
                setPrompt((current) => `${current}${current ? "\n" : ""}${body}`);
                setPromptLibraryOpen(false);
              }}
              onReplace={(body) => {
                setPrompt(body);
                setOptimizedPrompt("");
                setNegativePrompt("");
                setPromptLibraryOpen(false);
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PageWrapper({ children, id }: { children: ReactNode; id: string }) {
  return (
    <motion.div
      key={id}
      {...pageTransition}
      className="absolute inset-0 flex flex-col overflow-hidden bg-linen"
    >
      {children}
    </motion.div>
  );
}

function StudioHeader({
  title,
  subtitle,
  onBack,
  rightIcon,
  transparent = false,
}: {
  title: ReactNode;
  subtitle?: string;
  onBack?: () => void;
  rightIcon?: ReactNode;
  transparent?: boolean;
}) {
  return (
    <header
      className={`sticky top-0 z-40 flex items-center justify-between px-4 py-3 transition-all ${
        transparent ? "bg-transparent pt-6" : "glass-panel mx-3 mt-3 rounded-2xl"
      }`}
    >
      <button
        type="button"
        aria-label="返回"
        onClick={onBack}
        className={`flex size-10 items-center justify-center rounded-full border transition-all ${
          transparent
            ? "border-white/20 bg-black/20 text-white backdrop-blur-md hover:bg-black/40"
            : "border-white bg-white/50 text-stone-600 shadow-sm hover:bg-black/5 hover:text-stone-900"
        }`}
      >
        <ChevronLeft size={22} strokeWidth={1.5} className="-ml-0.5" />
      </button>

      <div className="flex min-w-0 flex-1 flex-col items-center px-3">
        <div
          className={`truncate text-center font-serif text-[17px] font-medium tracking-wide ${
            transparent ? "text-white drop-shadow-md" : "text-stone-800"
          }`}
        >
          {title}
        </div>
        {subtitle ? (
          <span
            className={`mt-0.5 truncate text-[10px] font-medium uppercase tracking-widest ${
              transparent ? "text-white/70" : "text-stone-400"
            }`}
          >
            {subtitle}
          </span>
        ) : null}
      </div>

      <div className="flex w-10 justify-end text-stone-600">{rightIcon}</div>
    </header>
  );
}

function EditorView({
  roomImageUrl,
  styleImageUrl,
  detailImageUrl,
  imageAnalysis,
  busyAction,
  uploadError,
  analysisError,
  onBack,
  onNext,
  onUploadRoom,
  onUploadStyle,
  onUploadDetail,
  onRemoveRoom,
  onRemoveStyle,
  onRemoveDetail,
  onAnalyze,
}: {
  roomImageUrl: string;
  styleImageUrl: string;
  detailImageUrl: string;
  imageAnalysis: MaterialAnalysis | null;
  busyAction: string | null;
  uploadError: string;
  analysisError: string;
  onBack: () => void;
  onNext: () => void;
  onUploadRoom: (file: File) => void;
  onUploadStyle: (file: File) => void;
  onUploadDetail: (file: File) => void;
  onRemoveRoom: () => void;
  onRemoveStyle: () => void;
  onRemoveDetail: () => void;
  onAnalyze: () => void;
}) {
  const roomFileInputRef = useRef<HTMLInputElement>(null);
  const styleFileInputRef = useRef<HTMLInputElement>(null);
  const detailFileInputRef = useRef<HTMLInputElement>(null);
  const roomUploading = busyAction === "upload-room";
  const styleUploading = busyAction === "upload-style";
  const detailUploading = busyAction === "upload-detail";
  const analysisReady = Boolean(
    roomImageUrl && styleImageUrl && detailImageUrl,
  );

  return (
    <div className="relative flex h-full flex-col">
      <StudioHeader
        title="设计工作室"
        subtitle={`${customerName} · ${planName}`}
        onBack={onBack}
        rightIcon={
          <button
            type="button"
            aria-label="更多操作"
            className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-stone-100"
          >
            <MoreHorizontal size={18} strokeWidth={1.5} />
          </button>
        }
      />

      <div className="hide-scrollbar flex-1 overflow-y-auto px-4 pb-28 pt-6">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="size-1.5 rounded-full bg-sage shadow-[0_0_8px_rgba(83,98,87,0.6)]" />
          <span className="text-[11px] font-medium tracking-widest text-sage">
            步骤 01 - 空间与材质
          </span>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="mb-4 flex items-end justify-between px-2">
            <h2 className="font-serif text-[18px] font-medium text-stone-800">
              客户空间
            </h2>
            <button
              type="button"
              className="flex items-center gap-1 text-[11px] tracking-wide text-stone-400 transition-colors hover:text-sage"
            >
              示例
            </button>
          </div>

          <div className="rounded-[24px] border border-white bg-white p-2 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.08)]">
            <div className="group relative aspect-[4/3] overflow-hidden rounded-[16px] bg-stone-50">
              {roomImageUrl ? (
                <img
                  src={roomImageUrl}
                  alt="客户空间"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[12px] text-stone-400">
                  请选择客户空间图片
                </div>
              )}
              {roomImageUrl ? (
                <button
                  type="button"
                  aria-label="删除客户空间图片"
                  onClick={onRemoveRoom}
                  className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm"
                >
                  <X size={15} />
                </button>
              ) : null}
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/40 to-transparent p-4">
                <div className="rounded-full border border-white/20 bg-white/20 px-2.5 py-1 text-[10px] tracking-wider text-white backdrop-blur-md">
                  原图
                </div>
              </div>
            </div>
            <div className="mt-1 flex divide-x divide-stone-100 py-2">
              <input
                ref={roomFileInputRef}
                type="file"
                accept="image/*"
                aria-label="上传客户空间图片"
                className="sr-only"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) onUploadRoom(file);
                  event.currentTarget.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => roomFileInputRef.current?.click()}
                disabled={roomUploading}
                className="flex flex-1 items-center justify-center gap-2 text-[12px] font-medium tracking-wide text-stone-500 transition-colors hover:text-sage"
              >
                <UploadCloud size={14} strokeWidth={2} />
                {roomUploading
                  ? "上传中..."
                  : roomImageUrl
                    ? "重新上传"
                    : "上传图片"}
              </button>
              <button
                type="button"
                onClick={() => roomFileInputRef.current?.click()}
                disabled={roomUploading}
                className="flex flex-1 items-center justify-center gap-2 text-[12px] font-medium tracking-wide text-stone-500 transition-colors hover:text-sage"
              >
                <RefreshCw size={14} strokeWidth={2} />
                更换图片
              </button>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="mb-4 flex items-end justify-between px-2">
            <h2 className="font-serif text-[18px] font-medium text-stone-800">
              材质样本
            </h2>
            <span className="text-[11px] tracking-wide text-stone-400">
              已选 {[styleImageUrl, detailImageUrl].filter(Boolean).length} / 2
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 px-2 pb-4">
            <MaterialReferenceCard
              title="整体款式"
              description="造型、层次与配色"
              imageUrl={styleImageUrl}
              imageAlt="整体款式参考"
              uploading={styleUploading}
              onChoose={() => styleFileInputRef.current?.click()}
              onRemove={onRemoveStyle}
              removeLabel="删除整体款式图片"
            />
            <MaterialReferenceCard
              title="材质细节"
              description="纹理、厚度与垂感"
              imageUrl={detailImageUrl}
              imageAlt="材质细节参考"
              uploading={detailUploading}
              onChoose={() => detailFileInputRef.current?.click()}
              onRemove={onRemoveDetail}
              removeLabel="删除材质细节图片"
            />
            <input
              ref={styleFileInputRef}
              type="file"
              accept="image/*"
              aria-label="上传整体款式图片"
              className="sr-only"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file) onUploadStyle(file);
                event.currentTarget.value = "";
              }}
            />
            <input
              ref={detailFileInputRef}
              type="file"
              accept="image/*"
              aria-label="上传材质细节图片"
              className="sr-only"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file) onUploadDetail(file);
                event.currentTarget.value = "";
              }}
            />
          </div>
        </motion.section>

        {uploadError ? (
          <p role="alert" className="mb-6 px-2 text-[12px] text-red-600">
            {uploadError}
          </p>
        ) : null}

        {analysisError ? (
          <p role="alert" className="mb-6 px-2 text-[12px] text-red-600">
            {analysisError}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onAnalyze}
          disabled={!analysisReady || busyAction !== null}
          className="mb-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-sage/15 bg-white px-4 py-4 text-[13px] font-medium tracking-wide text-sage shadow-sm transition-all hover:border-sage/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Wand2 size={16} />
          {busyAction === "analyze"
            ? "正在识别房间与材质..."
            : imageAnalysis
              ? "重新识别并生成文案"
              : "AI 识别并生成文案"}
        </button>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex h-24 items-center justify-center rounded-2xl border border-dashed border-stone-200/60 bg-white/40 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-stone-400">
              <ImageIcon size={16} strokeWidth={1.5} />
              <span className="text-[12px] font-medium tracking-wider">
                等待生成
              </span>
            </div>
          </div>
        </motion.section>
      </div>

      <div className="studio-action-bar">
        <div className="glass-panel flex gap-2 rounded-3xl p-2 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.15)]">
          <button
            type="button"
            aria-label="辅助操作"
            className="studio-icon-button size-14"
          >
            <MoreHorizontal size={20} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={onNext}
            className="studio-primary-button group relative flex flex-1 items-center justify-center gap-2 overflow-hidden"
          >
            <div className="absolute inset-0 h-full w-full -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-[pulse_1.5s_infinite]" />
            进入下一步
            <MoveRight size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

function MaterialReferenceCard({
  title,
  description,
  imageUrl,
  imageAlt,
  uploading,
  onChoose,
  onRemove,
  removeLabel,
}: {
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  uploading: boolean;
  onChoose: () => void;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-white bg-white p-2 shadow-sm">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-stone-50">
        {imageUrl ? (
          <img src={imageUrl} alt={imageAlt} className="h-full w-full object-cover" />
        ) : (
          <button
            type="button"
            onClick={onChoose}
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-stone-400"
          >
            <Plus size={20} />
            <span className="text-[10px]">添加图片</span>
          </button>
        )}
        {imageUrl ? (
          <button
            type="button"
            aria-label={removeLabel}
            onClick={onRemove}
            className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm"
          >
            <X size={13} />
          </button>
        ) : null}
      </div>
      <div className="px-1 pb-1 pt-2">
        <div className="text-[12px] font-medium text-stone-700">{title}</div>
        <div className="mt-0.5 text-[9px] text-stone-400">{description}</div>
        <button
          type="button"
          onClick={onChoose}
          disabled={uploading}
          className="mt-2 text-[10px] font-medium text-sage disabled:opacity-50"
        >
          {uploading ? "上传中..." : imageUrl ? "更换图片" : "选择图片"}
        </button>
      </div>
    </div>
  );
}

function RequirementsView({
  prompt,
  fidelity,
  busyAction,
  onBack,
  onPromptChange,
  onFidelityChange,
  onOpenPromptLibrary,
  onOptimize,
  onNext,
}: {
  prompt: string;
  fidelity: Fidelity;
  busyAction: string | null;
  onBack: () => void;
  onPromptChange: (value: string) => void;
  onFidelityChange: (value: Fidelity) => void;
  onOpenPromptLibrary: () => void;
  onOptimize: () => void;
  onNext: () => void;
}) {
  return (
    <div className="relative flex h-full flex-col">
      <StudioHeader
        title="生成要求"
        subtitle="步骤 02 · 核心构思"
        onBack={onBack}
        rightIcon={
          <button
            type="button"
            onClick={onOpenPromptLibrary}
            className="flex items-center gap-1 text-[11px] font-medium tracking-wider text-sage transition-opacity hover:opacity-80"
          >
            <LayoutTemplate size={14} strokeWidth={2} />
            模板库
          </button>
        }
      />

      <div className="hide-scrollbar flex-1 overflow-y-auto px-4 pb-32 pt-6">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="relative rounded-[24px] border border-stone-100 bg-white p-5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)]">
            <Quote size={24} className="absolute left-4 top-4 text-stone-100" />
            <textarea
              aria-label="生成要求"
              value={prompt}
              onChange={(event) => onPromptChange(event.target.value)}
              className="relative z-10 h-40 w-full resize-none bg-transparent font-serif text-[15px] italic leading-relaxed text-stone-700 outline-none placeholder:text-stone-300"
              placeholder="描述您期望的氛围、材质与光影细节..."
              spellCheck={false}
              maxLength={800}
            />
            <div className="mt-2 flex items-center justify-between border-t border-stone-50 pt-3">
              <button
                type="button"
                onClick={onOptimize}
                disabled={busyAction === "optimize"}
                className="flex items-center gap-1.5 rounded-full bg-sage/5 px-3 py-1.5 text-[11px] font-medium tracking-wide text-sage transition-colors hover:bg-sage/10"
              >
                <Wand2 size={12} strokeWidth={2} />
                {busyAction === "optimize" ? "润色中" : "AI 润色"}
              </button>
              <span className="font-mono text-[10px] text-stone-400">
                {prompt.length} / 800
              </span>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-10 px-2"
        >
          <h3 className="mb-4 text-[11px] font-medium tracking-widest text-stone-400">
            精选灵感词
          </h3>
          <div className="flex flex-wrap gap-2.5">
            {promptTags.map((tag) => (
              <button
                key={tag}
                type="button"
                className="rounded-full border border-stone-200 bg-white/50 px-4 py-2 text-[12px] font-medium text-stone-600 shadow-sm backdrop-blur-sm transition-all hover:border-sage hover:text-sage"
                onClick={() => onPromptChange(`${prompt}${prompt ? "\n" : ""}${tag}`)}
              >
                {tag}
              </button>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8 px-2"
        >
          <h3 className="mb-4 text-[11px] font-medium tracking-widest text-stone-400">
            还原度控制
          </h3>

          <div className="grid grid-cols-3 gap-3">
            {fidelityOptions.map(([id, title, desc, Icon]) => {
              const active = fidelity === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onFidelityChange(id as Fidelity)}
                  className={`flex min-h-[92px] flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all ${
                    active
                      ? "border-sage bg-sage text-white shadow-lg shadow-sage/20"
                      : "border-white bg-white/80 text-stone-600 shadow-sm hover:border-stone-300"
                  }`}
                >
                  <Icon size={18} strokeWidth={1.5} className="mb-2" />
                  <span className="mb-1 text-[12px] font-medium tracking-wide">
                    {title}
                  </span>
                  <span
                    className={`text-[9px] tracking-wider ${
                      active ? "text-white/80" : "text-stone-400"
                    }`}
                  >
                    {desc}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.section>
      </div>

      <div className="studio-action-bar">
        <div className="glass-panel flex rounded-3xl p-2 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.15)]">
          <button
            type="button"
            onClick={onNext}
            disabled={busyAction === "generate"}
            className="studio-primary-button flex w-full items-center justify-center gap-2"
          >
            {busyAction === "generate" ? "生成中" : "生成方案效果"}
            <Sparkles size={16} strokeWidth={1.5} className="text-sand" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultView({
  imageUrl,
  shortVideoScript,
  socialCopy,
  customerScript,
  busyAction,
  onBack,
  onSimilar,
  onMarketing,
  onNext,
}: {
  imageUrl: string;
  shortVideoScript: string;
  socialCopy: string;
  customerScript: string;
  busyAction: string | null;
  onBack: () => void;
  onSimilar: () => void;
  onMarketing: () => void;
  onNext: () => void;
}) {
  const displayImage = isRenderableImageUrl(imageUrl) ? imageUrl : IMAGES.result;

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-black text-white">
      <motion.div
        initial={{ scale: 1.05, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="absolute inset-0 z-0 bg-stone-900"
      >
        <img
          src={displayImage}
          alt="生成效果图"
          className="h-full w-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
      </motion.div>

      <StudioHeader
        title={<span className="text-[18px]">效果呈现</span>}
        onBack={onBack}
        transparent
        rightIcon={
          <button
            type="button"
            aria-label="重新生成"
            onClick={onSimilar}
            disabled={busyAction === "generate"}
            className="flex size-10 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white backdrop-blur-md transition-colors hover:bg-black/40"
          >
            <RefreshCw size={16} strokeWidth={2} />
          </button>
        }
      />

      <div className="z-10 flex flex-1 flex-col justify-end p-6 pb-8">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-[10px] font-medium tracking-widest text-white shadow-sm backdrop-blur-md">
              渲染方案 01
            </span>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 backdrop-blur-md transition-colors hover:bg-black/60"
            >
              <SlidersHorizontal size={12} className="text-white" />
              <span className="text-[10px] font-medium tracking-widest text-white">
                对比原图
              </span>
            </button>
          </div>

          <h1 className="mb-3 font-serif text-[32px] font-medium leading-tight tracking-wide drop-shadow-lg">
            柔和雅致
            <br />
            休憩之境
          </h1>
          <p className="mb-6 max-w-[90%] text-[13px] font-light leading-relaxed tracking-wide text-white/90">
            柔软的触感与温润的米白色调，交织在细腻光影中，为客户呈现宁静、柔软、有呼吸感的空间。
          </p>

          {shortVideoScript || socialCopy || customerScript ? (
            <div className="mb-4 max-h-28 overflow-y-auto rounded-[20px] border border-white/10 bg-black/30 p-4 text-[12px] leading-6 text-white/88 backdrop-blur-xl">
              {shortVideoScript ? <p>{shortVideoScript}</p> : null}
              {socialCopy ? <p className="mt-2">{socialCopy}</p> : null}
              {customerScript ? <p className="mt-2">{customerScript}</p> : null}
            </div>
          ) : null}

          <div className="mb-4 grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={onNext}
              disabled={busyAction === "save"}
              className="col-span-2 flex items-center justify-center gap-2 rounded-[20px] bg-white py-4 text-[13px] font-medium tracking-widest text-stone-900 shadow-xl transition-colors hover:bg-stone-100"
            >
              <Share2 size={16} strokeWidth={1.5} />
              {busyAction === "save" ? "保存中" : "进入方案展示"}
            </button>
            <button
              type="button"
              aria-label="下载效果图"
              className="flex items-center justify-center rounded-[20px] border border-white/20 bg-white/10 py-4 text-white backdrop-blur-xl transition-colors hover:bg-white/20"
            >
              <Download size={18} strokeWidth={1.5} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onMarketing}
              disabled={busyAction === "marketing"}
              className="flex items-center justify-center gap-2 rounded-[20px] border border-white/10 bg-black/30 py-3.5 text-white backdrop-blur-xl transition-colors hover:bg-black/50"
            >
              <Wand2 size={16} strokeWidth={1.5} className="text-stone-300" />
              <span className="text-[12px] font-medium tracking-widest text-stone-200">
                {busyAction === "marketing" ? "生成中" : "生成营销文案"}
              </span>
            </button>
            <button
              type="button"
              onClick={onSimilar}
              disabled={busyAction === "generate"}
              className="flex items-center justify-center gap-2 rounded-[20px] border border-white/10 bg-black/30 py-3.5 text-white backdrop-blur-xl transition-colors hover:bg-black/50"
            >
              <LayoutGrid size={16} strokeWidth={1.5} className="text-stone-300" />
              <span className="text-[12px] font-medium tracking-widest text-stone-200">
                生成更多方案
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function DisplayView({
  customerTab,
  fidelity,
  imageUrl,
  socialCopy,
  customerScript,
  onBack,
  onCustomerTabChange,
}: {
  customerTab: CustomerTab;
  fidelity: Fidelity;
  imageUrl: string;
  socialCopy: string;
  customerScript: string;
  onBack: () => void;
  onCustomerTabChange: (tab: CustomerTab) => void;
}) {
  const fidelityLabel =
    fidelityOptions.find(([value]) => value === fidelity)?.[1] ?? "平衡";
  const displayImage = isRenderableImageUrl(imageUrl) ? imageUrl : IMAGES.result;

  return (
    <div className="relative flex h-full flex-col">
      <StudioHeader
        title="方案展示"
        onBack={onBack}
        rightIcon={
          <button
            type="button"
            className="text-[11px] font-medium tracking-widest text-sage transition-opacity hover:opacity-80"
          >
            编辑
          </button>
        }
      />

      <div className="mx-4 mt-4 grid rounded-full bg-white/55 p-1 text-center text-[12px] font-medium text-stone-500 shadow-sm">
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => onCustomerTabChange("effect")}
            className={`rounded-full px-3 py-2 transition-all ${
              customerTab === "effect"
                ? "bg-sage text-white shadow-md shadow-sage/15"
                : "hover:text-sage"
            }`}
          >
            展示效果
          </button>
          <button
            type="button"
            onClick={() => onCustomerTabChange("details")}
            className={`rounded-full px-3 py-2 transition-all ${
              customerTab === "details"
                ? "bg-sage text-white shadow-md shadow-sage/15"
                : "hover:text-sage"
            }`}
          >
            方案细节
          </button>
        </div>
      </div>

      <div className="hide-scrollbar flex-1 overflow-y-auto px-4 pb-32 pt-4">
        {customerTab === "details" ? (
          <div className="space-y-4">
            <section className="studio-card p-5">
              <h2 className="font-serif text-[18px] font-medium text-stone-800">
                方案信息
              </h2>
              <div className="mt-5 space-y-3 text-[13px] leading-6 text-stone-600">
                <div className="rounded-2xl bg-white/55 px-4 py-3">
                  客户：{customerName}
                </div>
                <div className="rounded-2xl bg-white/55 px-4 py-3">
                  房间：客厅窗帘方案
                </div>
                <div className="rounded-2xl bg-white/55 px-4 py-3">
                  样本：米白高遮光绒布窗帘
                </div>
                <div className="rounded-2xl bg-white/55 px-4 py-3">
                  还原度：{fidelityLabel}
                </div>
              </div>
            </section>
            <section className="studio-card p-5">
              <h3 className="font-serif text-[16px] font-medium text-stone-800">
                生成上下文
              </h3>
              <ul className="mt-4 space-y-2 text-[13px] leading-6 text-stone-600">
                <li>保留原房间结构、窗户位置和透视角度。</li>
                <li>保留样本主要颜色、材质纹理和自然垂感。</li>
                <li>避免窗户变形、窗帘位置错误和渲染不真实。</li>
              </ul>
            </section>
          </div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative mb-8"
            >
              <div className="overflow-hidden rounded-[24px] border-4 border-white bg-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]">
                <img
                  src={displayImage}
                  alt="方案展示图"
                  className="aspect-square w-full object-cover"
                />
              </div>

              <div className="absolute -bottom-4 right-6 flex flex-col items-center rounded-full border-2 border-white bg-sage px-5 py-2.5 text-white shadow-lg">
                <span className="mb-0.5 text-[10px] tracking-widest opacity-80">
                  风格特征
                </span>
                <span className="font-serif text-[13px]">现代极简</span>
              </div>
            </motion.div>

            <div className="mt-10 space-y-8 px-2">
              <CopySection title="社交分享方案">
                {socialCopy ||
                  "在喧嚣中寻找宁静。柔软的米色基调配合温润光影，让每一次归家都成为一场治愈之旅。"}
              </CopySection>
              <CopySection title="客户沟通话术">
                {customerScript ||
                  "这套方案以暖白和米色为基准，最大化引入自然光照。主窗帘推荐采用高克重绒面材质，视觉触感细腻，也能提供稳定遮光包裹感。"}
              </CopySection>
            </div>
          </>
        )}
      </div>

      <div className="studio-action-bar">
        <button
          type="button"
          className="studio-primary-button flex w-full items-center justify-center gap-2"
        >
          发送给客户
          <ArrowRight size={16} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

function CopySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="mb-3 flex items-end justify-between">
        <h3 className="font-serif text-[14px] text-stone-800">{title}</h3>
        <button
          type="button"
          className="flex items-center gap-1 text-[10px] tracking-widest text-stone-400 transition-colors hover:text-sage"
        >
          <Copy size={12} />
          复制
        </button>
      </div>
      <div className="relative">
        <div className="absolute bottom-0 left-0 top-0 w-px bg-sand/50" />
        <p className="pl-4 font-serif text-[13px] leading-relaxed text-stone-600">
          {children}
        </p>
      </div>
    </motion.section>
  );
}

function PromptLibrarySheet({
  onClose,
  onInsert,
  onReplace,
}: {
  onClose: () => void;
  onInsert: (body: string) => void;
  onReplace: (body: string) => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = promptTemplates[selectedIndex];

  return (
    <div className="absolute inset-0 z-50 flex items-end bg-black/32">
      <motion.section
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        aria-modal="true"
        aria-label="提示词库"
        role="dialog"
        className="max-h-[78%] w-full overflow-hidden rounded-t-[28px] bg-linen shadow-[0_-18px_42px_rgba(31,41,55,0.18)]"
      >
        <div className="mx-auto mt-2 h-1.5 w-11 rounded-full bg-stone-300" />
        <div className="flex items-center justify-between border-b border-stone-200/60 px-4 py-3">
          <div>
            <h2 className="font-serif text-[17px] font-medium text-stone-900">
              提示词库
            </h2>
            <p className="mt-0.5 text-[12px] text-stone-500">
              先预览，再插入或替换当前内容
            </p>
          </div>
          <button
            type="button"
            aria-label="关闭提示词库"
            className="grid size-8 place-items-center rounded-full bg-white text-stone-500 shadow-sm"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="grid max-h-[calc(78vh-132px)] grid-cols-[128px_1fr] overflow-hidden">
          <div className="hide-scrollbar space-y-2 overflow-y-auto border-r border-stone-200/60 bg-white/42 p-3">
            {promptTemplates.map((template, index) => (
              <button
                key={template.title}
                type="button"
                className={`w-full rounded-2xl border px-3 py-3 text-left transition-all ${
                  selectedIndex === index
                    ? "border-sage bg-white text-sage shadow-sm"
                    : "border-transparent bg-transparent text-stone-700"
                }`}
                onClick={() => setSelectedIndex(index)}
              >
                <span className="block text-[13px] font-semibold leading-5">
                  {template.title}
                </span>
                <span className="mt-1 block text-[11px] text-stone-400">
                  {template.category}
                </span>
              </button>
            ))}
          </div>

          <div className="hide-scrollbar overflow-y-auto p-4">
            <span className="rounded-full bg-sage/8 px-3 py-1 text-[11px] font-medium text-sage">
              {selected.category}
            </span>
            <h3 className="mt-3 font-serif text-[16px] font-medium text-stone-950">
              {selected.title}
            </h3>
            <p className="mt-3 rounded-2xl border border-white bg-white/64 p-3 text-[13px] leading-6 text-stone-700">
              {selected.body}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-stone-200/60 bg-linen px-4 pb-4 pt-3">
          <button
            type="button"
            className="studio-secondary-button"
            onClick={() => onInsert(selected.body)}
          >
            插入到当前
          </button>
          <button
            type="button"
            className="studio-primary-button"
            onClick={() => onReplace(selected.body)}
          >
            替换整段
          </button>
        </div>
      </motion.section>
    </div>
  );
}
