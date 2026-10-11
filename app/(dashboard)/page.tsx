"use client";

/* eslint-disable @next/next/no-img-element */

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckCircle2,
  ChevronLeft,
  Copy,
  Download,
  Focus,
  Image as ImageIcon,
  LayoutGrid,
  LayoutTemplate,
  Maximize2,
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
import { ImageViewer } from "@/components/image-viewer";

const roomPrompt =
  "保留原房间的结构、家具、窗户位置和光线方向，仅调整窗帘。参考整体款式图的造型与配色，以及材质细节图的纹理与垂感，生成真实自然的窗帘上墙效果。";

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

const materialSummary = "请参考商家上传的款式与材质图片；未识别的颜色、成分及遮光性能不作断言。";
const demoRoomImageUrl =
  "/demo/living-room.png";
const demoSampleImageUrl =
  "/demo/curtain-fabric.png";
const demoDetailImageUrl =
  "/demo/curtain-fabric.png";

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
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.12 },
  },
  transition: { duration: 0.2, ease: pageEase },
};

export default function WorkbenchPage() {
  const [activeStep, setActiveStep] = useState<FlowStep>(0);
  const [customerName, setCustomerName] = useState("王女士");
  const [customerId, setCustomerId] = useState("");
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [planName, setPlanName] = useState("客厅");
  const [prompt, setPrompt] = useState(roomPrompt);
  const [originalPrompt, setOriginalPrompt] = useState(roomPrompt);
  const [negativePrompt, setNegativePrompt] = useState("");
  const [fidelity, setFidelity] = useState<Fidelity>("balanced");
  const [roomImageUrl, setRoomImageUrl] = useState(demoRoomImageUrl);
  const [styleImageUrl, setStyleImageUrl] = useState(demoSampleImageUrl);
  const [detailImageUrl, setDetailImageUrl] = useState(demoDetailImageUrl);
  const [imageAnalysis, setImageAnalysis] = useState<MaterialAnalysis | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageJobId, setImageJobId] = useState("");
  const [shortVideoScript, setShortVideoScript] = useState("");
  const [socialCopy, setSocialCopy] = useState("");
  const [customerScript, setCustomerScript] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [analysisError, setAnalysisError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [savedPlanId, setSavedPlanId] = useState("");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [promptLibraryOpen, setPromptLibraryOpen] = useState(false);
  const [customerTab, setCustomerTab] = useState<CustomerTab>("effect");
  const frameRef = useRef<HTMLDivElement>(null);
  const inputReady = Boolean(roomImageUrl && styleImageUrl && detailImageUrl);

  useEffect(() => {
    let stopped = false;
    void fetch("/api/customers").then(response => response.ok ? response.json() : null).then(result => { if (!stopped && result?.customers) setCustomers(result.customers); }).catch(() => undefined);
    return () => { stopped = true; };
  }, []);

  useEffect(() => {
    let stopped = false;
    const saved = localStorage.getItem("image-generation-job");
    if (saved) { void Promise.resolve().then(() => { if (!stopped) { setImageJobId(saved); setBusyAction("generate"); } }); }
    else { void fetch("/api/ai/generate-image", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(job => {
      if (!stopped && job?.jobId) { localStorage.setItem("image-generation-job", job.jobId); setImageJobId(job.jobId); setBusyAction("generate"); }
    }).catch(() => undefined); }
    return () => { stopped = true; };
  }, []);

  useEffect(() => {
    if (!imageJobId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let restored = false;
    async function poll() {
      try {
        const response = await fetch(`/api/ai/generate-image/${encodeURIComponent(imageJobId)}`, { cache: "no-store" });
        const job = await response.json();
        if (stopped) return;
        if (response.status === 401 || response.status === 404) throw new Error(job.error || "任务无法访问");
        if (!response.ok) { setActionNotice("查询暂时失败，将自动继续查询；无需重复生成"); timer = setTimeout(poll, 10000); return; }
        if (!restored && job.input) {
          setRoomImageUrl(job.input.roomImageUrl); setStyleImageUrl(job.input.styleImageUrl); setDetailImageUrl(job.input.detailImageUrl);
          setPrompt(job.input.optimizedPrompt); setOriginalPrompt(job.input.optimizedPrompt);
          setNegativePrompt(job.input.negativePrompt || ""); setFidelity(job.input.fidelity);
          setImageAnalysis(job.input.imageAnalysis ? JSON.parse(job.input.imageAnalysis) : null);
          clearResult(); restored = true;
        }
        if (job.status === "failed") throw new Error(job.error || "生成失败，请重试");
        if (job.status === "succeeded") {
          if (!job.imageUrl) throw new Error("未收到效果图");
          clearResult(); setImageUrl(job.imageUrl); setActiveStep(2);
          localStorage.removeItem("image-generation-job"); setImageJobId(""); setBusyAction(null); return;
        }
        setActionNotice(`效果图正在生成，已等待 ${job.elapsedSeconds || 0} 秒。可以刷新页面后继续查看。`);
        timer = setTimeout(poll, 5000);
      } catch (error) {
        if (stopped) return;
        if (error instanceof TypeError) { timer = setTimeout(poll, 10000); return; }
        setActionError(error instanceof Error ? error.message : "查询失败");
        localStorage.removeItem("image-generation-job"); setImageJobId(""); setBusyAction(null);
      }
    }
    void poll();
    return () => { stopped = true; clearTimeout(timer); };
  }, [imageJobId]);

  function clearResult() {
    setImageUrl("");
    setShortVideoScript("");
    setSocialCopy("");
    setCustomerScript("");
    setSavedPlanId("");
    setActionNotice("");
    setActionError("");
  }

  function updatePrompt(value: string) {
    setPrompt(value);
    setOriginalPrompt(value);
    setNegativePrompt("");
    clearResult();
  }

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

    const result = (await response.json().catch(() => ({}))) as T & {
      error?: string;
    };

    if (!response.ok) {
      throw new Error(result.error || "请求失败，请稍后重试");
    }

    return result;
  }

  async function optimizePrompt() {
    if (busyAction || !prompt.trim()) return;
    setBusyAction("optimize");
    setActionError("");
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
      setNegativePrompt(result.negativePrompt);
      clearResult();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "AI 润色失败，请重试",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function uploadImage(file: File, target: "room" | "style" | "detail") {
    if (!/\.(jpe?g|png|webp)$/i.test(file.name) || !file.size || file.size > 4 * 1024 * 1024) {
      setUploadError("请选择 JPG、PNG 或 WebP 图片，单张不超过 4MB"); return;
    }
    if (busyAction) return;
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
      setNegativePrompt("");
      clearResult();
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "图片上传失败，请稍后重试",
      );
    } finally {
      setBusyAction(null);
    }
  }

  function removeImage(target: "room" | "style" | "detail") {
    if (busyAction) return;
    if (target === "room") setRoomImageUrl("");
    if (target === "style") setStyleImageUrl("");
    if (target === "detail") setDetailImageUrl("");
    setImageAnalysis(null);
    setAnalysisError("");
    setNegativePrompt("");
    clearResult();
  }

  async function analyzeUploadedImages() {
    if (busyAction || !inputReady) return;
    setBusyAction("analyze");
    setAnalysisError("");
    try {
      const result = await postJson<MaterialAnalysis>(
        "/api/ai/analyze-materials",
        { roomImageUrl, styleImageUrl, detailImageUrl },
      );
      setImageAnalysis(result);
      updatePrompt(result.templatePrompt);
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
    if (busyAction || !inputReady || !prompt.trim()) return;
    setBusyAction("generate");
    setActionError("");
    try {
      const result = await postJson<{ jobId: string }>(
        "/api/ai/generate-image",
        {
          roomImageUrl,
          styleImageUrl,
          detailImageUrl,
          optimizedPrompt: prompt,
          negativePrompt,
          fidelity,
          imageAnalysis: imageAnalysis ? JSON.stringify(imageAnalysis) : "",
          referenceImageUrl,
        },
      );
      if (!result.jobId) throw new Error("未收到任务编号，请重试");
      clearResult();
      localStorage.setItem("image-generation-job", result.jobId);
      setImageJobId(result.jobId);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "效果图生成失败，请重试",
      );
    } finally {
      // Polling owns the busy state once a task has been accepted.
      if (!localStorage.getItem("image-generation-job")) setBusyAction(null);
    }
  }

  async function generateMarketing() {
    if (busyAction || !imageUrl) return;
    setBusyAction("marketing");
    setActionError("");
    try {
      const result = await postJson<{
        shortVideoScript: string;
        socialCopy: string;
        customerScript: string;
      }>("/api/ai/generate-marketing", {
        materialSummary: imageAnalysis
          ? `${imageAnalysis.styleSummary}；${imageAnalysis.materialSummary}`
          : materialSummary,
        roomSummary: prompt,
        effectImageUrl: imageUrl,
        customerNotes: `${customerName} · ${planName}窗帘方案`,
      });
      setShortVideoScript(result.shortVideoScript);
      setSocialCopy(result.socialCopy);
      setCustomerScript(result.customerScript);
      setSavedPlanId("");
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "营销文案生成失败，请重试",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function savePlan() {
    if (busyAction || !imageUrl) return;
    if (savedPlanId) {
      setActionNotice("方案已保存");
      setActiveStep(3);
      return;
    }
    setBusyAction("save");
    setActionError("");
    setActionNotice("");
    try {
      const result = await postJson<{ plan: { id: string } }>("/api/plans", {
        customerId: customerId || null,
        customerName: customerName.trim(),
        notes: `${planName.trim()}窗帘方案`,
        roomImageUrl,
        sampleImageUrl: styleImageUrl,
        styleImageUrl,
        detailImageUrl,
        imageAnalysis: imageAnalysis ? JSON.stringify(imageAnalysis) : "{}",
        originalPrompt,
        optimizedPrompt: prompt,
        negativePrompt,
        fidelity,
        primaryImageUrl: imageUrl,
        shortVideoScript,
        socialCopy,
        customerScript,
        status: "ready",
        materialIds: [],
      });
      setSavedPlanId(result.plan.id);
      setActionNotice("方案已保存");
      setCustomerTab("effect");
      setActiveStep(3);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "方案保存失败，请重试",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function downloadImage() {
    if (!imageUrl || downloading) return;

    setDownloading(true);
    setActionError("");
    setActionNotice("");
    try {
      const response = await fetch(
        `/api/files/download?url=${encodeURIComponent(imageUrl)}`,
      );
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(result.error || "高清图片下载失败");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const disposition = response.headers.get("content-disposition") ?? "";
      const fileName =
        disposition.match(/filename="([^"]+)"/)?.[1] ?? "curtain-plan.png";
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setActionNotice("高清图已开始下载");
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "高清图片下载失败",
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="studio-page flex min-h-[calc(100dvh-58px)] items-center justify-center">
      <div ref={frameRef} className="mobile-studio-frame">
        {(activeStep === 0 && (actionNotice || actionError)) || (activeStep === 1 && actionNotice && !actionError) ? <p role={actionError ? "alert" : "status"} className="p-3 text-sm text-stone-700">{actionError || actionNotice}</p> : null}
        <div className="relative h-full min-h-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {activeStep === 0 ? (
              <PageWrapper id="editor">
                <EditorView
                  customers={customers}
                  customerId={customerId}
                  onCustomerSelect={(id) => { setCustomerId(id); const customer = customers.find(item => item.id === id); if (customer) setCustomerName(customer.name); clearResult(); }}
                  customerName={customerName}
                  planName={planName}
                  onCustomerNameChange={(value) => { setCustomerName(value); clearResult(); }}
                  onPlanNameChange={(value) => { setPlanName(value); clearResult(); }}
                  onRestoreDemo={() => {
                    setRoomImageUrl(demoRoomImageUrl);
                    setStyleImageUrl(demoSampleImageUrl);
                    setDetailImageUrl(demoDetailImageUrl);
                    setImageAnalysis(null);
                    setAnalysisError("");
                    setUploadError("");
                    updatePrompt(roomPrompt);
                  }}
                  roomImageUrl={roomImageUrl}
                  styleImageUrl={styleImageUrl}
                  detailImageUrl={detailImageUrl}
                  imageAnalysis={imageAnalysis}
                  busyAction={busyAction}
                  uploadError={uploadError}
                  analysisError={analysisError}
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
                  actionError={actionError}
                  inputReady={inputReady}
                  onBack={() => { if (!busyAction) setActiveStep(0); }}
                  onPromptChange={updatePrompt}
                  onFidelityChange={(value) => { setFidelity(value); setNegativePrompt(""); clearResult(); }}
                  onOpenPromptLibrary={() => setPromptLibraryOpen(true)}
                  onOptimize={optimizePrompt}
                  onNext={() => generateImage()}
                />
              </PageWrapper>
            ) : null}
            {activeStep === 2 ? (
              <PageWrapper id="result">
                <ResultView
                  roomImageUrl={roomImageUrl}
                  planName={planName}
                  imageUrl={imageUrl}
                  shortVideoScript={shortVideoScript}
                  socialCopy={socialCopy}
                  customerScript={customerScript}
                  busyAction={busyAction}
                  downloading={downloading}
                  actionNotice={actionNotice}
                  actionError={actionError}
                  onBack={() => { if (!busyAction) setActiveStep(1); }}
                  onSimilar={() => generateImage(imageUrl)}
                  onMarketing={generateMarketing}
                  onNext={savePlan}
                  onDownload={downloadImage}
                  onOpenViewer={() => setViewerOpen(true)}
                />
              </PageWrapper>
            ) : null}
            {activeStep === 3 ? (
              <PageWrapper id="display">
                <DisplayView
                  customerName={customerName}
                  planName={planName}
                  materialDescription={imageAnalysis?.materialSummary || "未进行 AI 识别，请以实际样本为准"}
                  prompt={prompt}
                  onEdit={() => setActiveStep(1)}
                  customerTab={customerTab}
                  fidelity={fidelity}
                  imageUrl={imageUrl}
                  socialCopy={socialCopy}
                  customerScript={customerScript}
                  actionNotice={actionNotice}
                  actionError={actionError}
                  savedPlanId={savedPlanId}
                  downloading={downloading}
                  onBack={() => setActiveStep(2)}
                  onCustomerTabChange={setCustomerTab}
                  onDownload={downloadImage}
                  onOpenViewer={() => setViewerOpen(true)}
                />
              </PageWrapper>
            ) : null}
          </AnimatePresence>

          {promptLibraryOpen ? (
            <PromptLibrarySheet
              onClose={() => setPromptLibraryOpen(false)}
              onInsert={(body) => {
                updatePrompt(`${prompt}${prompt ? "\n" : ""}${body}`);
                setPromptLibraryOpen(false);
              }}
              onReplace={(body) => {
                updatePrompt(body);
                setPromptLibraryOpen(false);
              }}
            />
          ) : null}
          <ImageViewer
            imageUrl={imageUrl}
            open={viewerOpen}
            onClose={() => setViewerOpen(false)}
            onDownload={downloadImage}
            downloading={downloading}
          />
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
      {onBack ? <button
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
      </button> : <div className="size-10" />}

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
  customers,
  customerId,
  onCustomerSelect,
  customerName,
  planName,
  onCustomerNameChange,
  onPlanNameChange,
  onRestoreDemo,
  roomImageUrl,
  styleImageUrl,
  detailImageUrl,
  imageAnalysis,
  busyAction,
  uploadError,
  analysisError,
  onNext,
  onUploadRoom,
  onUploadStyle,
  onUploadDetail,
  onRemoveRoom,
  onRemoveStyle,
  onRemoveDetail,
  onAnalyze,
}: {
  customers: { id: string; name: string }[];
  customerId: string;
  onCustomerSelect: (id: string) => void;
  customerName: string;
  planName: string;
  onCustomerNameChange: (value: string) => void;
  onPlanNameChange: (value: string) => void;
  onRestoreDemo: () => void;
  roomImageUrl: string;
  styleImageUrl: string;
  detailImageUrl: string;
  imageAnalysis: MaterialAnalysis | null;
  busyAction: string | null;
  uploadError: string;
  analysisError: string;
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
      />

      <div className="hide-scrollbar flex-1 overflow-y-auto px-4 pb-28 pt-6">
        <label className="mb-4 block px-2 text-xs text-stone-600">关联客户
          <select value={customerId} onChange={(event) => onCustomerSelect(event.target.value)} disabled={busyAction !== null} className="mt-2 w-full rounded-xl border border-stone-200 bg-white p-3"><option value="">仅填写称呼</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select>
          <Link href="/customers" className="mt-2 inline-block text-sage underline">管理客户</Link>
        </label>
        <div className="mb-6 grid grid-cols-2 gap-3 px-2">
          <label className="text-xs text-stone-600">
            客户称呼
            <input value={customerName} onChange={(event) => onCustomerNameChange(event.target.value)} disabled={busyAction !== null || Boolean(customerId)} maxLength={60} className="mt-2 w-full rounded-xl border border-stone-200 bg-white p-3" />
          </label>
          <label className="text-xs text-stone-600">
            房间名称
            <input value={planName} onChange={(event) => onPlanNameChange(event.target.value)} disabled={busyAction !== null} maxLength={60} className="mt-2 w-full rounded-xl border border-stone-200 bg-white p-3" />
          </label>
        </div>
        <p className="mb-5 px-2 text-xs leading-6 text-stone-500">已预填示例信息与图片，可修改后体验。请上传房间、整体款式和材质细节三张图片。</p>
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
              onClick={onRestoreDemo}
              disabled={busyAction !== null}
              className="flex items-center gap-1 text-[11px] tracking-wide text-stone-400 transition-colors hover:text-sage"
            >
              恢复示例
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
                  disabled={busyAction !== null}
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
                accept="image/jpeg,image/png,image/webp"
                aria-label="上传客户空间图片"
                disabled={busyAction !== null}
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
                disabled={busyAction !== null}
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
                disabled={busyAction !== null}
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
              disabled={busyAction !== null}
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
              disabled={busyAction !== null}
              onChoose={() => detailFileInputRef.current?.click()}
              onRemove={onRemoveDetail}
              removeLabel="删除材质细节图片"
            />
            <input
              ref={styleFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="上传整体款式图片"
              disabled={busyAction !== null}
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
              accept="image/jpeg,image/png,image/webp"
              aria-label="上传材质细节图片"
              disabled={busyAction !== null}
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
            onClick={onNext}
            disabled={!analysisReady || !customerName.trim() || !planName.trim() || busyAction !== null}
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
  disabled,
  onChoose,
  onRemove,
  removeLabel,
}: {
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  uploading: boolean;
  disabled: boolean;
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
            disabled={disabled}
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
            disabled={disabled}
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
          disabled={disabled}
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
  actionError,
  inputReady,
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
  actionError: string;
  inputReady: boolean;
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
            disabled={busyAction !== null}
            className="flex items-center gap-1 text-[11px] font-medium tracking-wider text-sage transition-opacity hover:opacity-80"
          >
            <LayoutTemplate size={14} strokeWidth={2} />
            模板库
          </button>
        }
      />

      <div className="hide-scrollbar flex-1 overflow-y-auto px-4 pb-32 pt-6">
        {actionError ? <p role="alert" className="mb-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{actionError}</p> : null}
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
              disabled={busyAction !== null}
              onChange={(event) => onPromptChange(event.target.value)}
              className="relative z-10 h-40 w-full resize-none bg-transparent font-serif text-[15px] italic leading-relaxed text-stone-700 outline-none placeholder:text-stone-300"
              placeholder="描述您期望的氛围、材质与光影细节..."
              spellCheck={false}
            />
            <div className="mt-2 flex items-center justify-between border-t border-stone-50 pt-3">
              <button
                type="button"
                onClick={onOptimize}
                disabled={busyAction !== null || !prompt.trim()}
                className="flex items-center gap-1.5 rounded-full bg-sage/5 px-3 py-1.5 text-[11px] font-medium tracking-wide text-sage transition-colors hover:bg-sage/10"
              >
                <Wand2 size={12} strokeWidth={2} />
                {busyAction === "optimize" ? "润色中" : "AI 润色"}
              </button>
              <span className="font-mono text-[10px] text-stone-400">
                {prompt.length} 字
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
                disabled={busyAction !== null}
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
                  disabled={busyAction !== null}
                  aria-pressed={active}
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
            disabled={busyAction !== null || !inputReady || !prompt.trim()}
            className="studio-primary-button flex w-full items-center justify-center gap-2"
          >
            {busyAction === "generate" ? "生成中" : "生成方案效果"}
            <Sparkles size={16} strokeWidth={1.5} className="text-sand" />
          </button>
        </div>
        {busyAction === "generate" && <p role="status" className="mt-2 text-center text-xs text-stone-600">任务已提交，生成期间可以刷新页面后继续查看，无需重复点击。</p>}
      </div>
    </div>
  );
}

function ResultView({
  roomImageUrl,
  planName,
  imageUrl,
  shortVideoScript,
  socialCopy,
  customerScript,
  busyAction,
  downloading,
  actionNotice,
  actionError,
  onBack,
  onSimilar,
  onMarketing,
  onNext,
  onDownload,
  onOpenViewer,
}: {
  roomImageUrl: string;
  planName: string;
  imageUrl: string;
  shortVideoScript: string;
  socialCopy: string;
  customerScript: string;
  busyAction: string | null;
  downloading: boolean;
  actionNotice: string;
  actionError: string;
  onBack: () => void;
  onSimilar: () => void;
  onMarketing: () => void;
  onNext: () => void;
  onDownload: () => void;
  onOpenViewer: () => void;
}) {
  const [showOriginal, setShowOriginal] = useState(false);
  const displayImage = imageUrl;

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-black text-white">
      <motion.div
        initial={{ scale: 1.05, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        className="absolute inset-0 z-0 bg-stone-900"
      >
        <img
          src={showOriginal ? roomImageUrl : displayImage}
          alt={showOriginal ? "客户空间原图" : "生成效果图"}
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
            disabled={busyAction !== null}
            className="flex size-10 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white backdrop-blur-md transition-colors hover:bg-black/40"
          >
            <RefreshCw size={16} strokeWidth={2} />
          </button>
        }
      />

      <button
        type="button"
        aria-label="放大查看效果图"
        onClick={onOpenViewer}
        className="absolute right-4 top-[82px] z-20 grid size-11 place-items-center rounded-full border border-white/20 bg-black/45 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/65"
      >
        <Maximize2 size={18} aria-hidden="true" />
      </button>

      <div className="z-10 flex flex-1 flex-col justify-end p-6 pb-8">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-[10px] font-medium tracking-widest text-white shadow-sm backdrop-blur-md">
              {showOriginal ? "客户空间原图" : "生成效果图"}
            </span>
            <button
              type="button"
              onClick={() => setShowOriginal((value) => !value)}
              aria-pressed={showOriginal}
              className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 backdrop-blur-md transition-colors hover:bg-black/60"
            >
              <SlidersHorizontal size={12} className="text-white" />
              <span className="text-[10px] font-medium tracking-widest text-white">
                {showOriginal ? "返回效果图" : "对比原图"}
              </span>
            </button>
          </div>

          <h1 className="mb-3 font-serif text-[32px] font-medium leading-tight tracking-wide drop-shadow-lg">
            {planName}窗帘方案
          </h1>
          <p className="mb-6 max-w-[90%] text-[13px] font-light leading-relaxed tracking-wide text-white/90">
            请对比原图检查窗户位置、房间结构与材质表现。AI 效果图供方案沟通参考，实际颜色和尺寸请以实物为准。
          </p>

          {shortVideoScript || socialCopy || customerScript ? (
            <div className="mb-4 max-h-28 overflow-y-auto rounded-[20px] border border-white/10 bg-black/30 p-4 text-[12px] leading-6 text-white/88 backdrop-blur-xl">
              {shortVideoScript ? <p>{shortVideoScript}</p> : null}
              {socialCopy ? <p className="mt-2">{socialCopy}</p> : null}
              {customerScript ? <p className="mt-2">{customerScript}</p> : null}
            </div>
          ) : null}

          {actionError ? (
            <div
              role="alert"
              className="mb-4 rounded-2xl border border-red-300/30 bg-red-950/55 px-4 py-3 text-[12px] leading-5 text-red-100 backdrop-blur-md"
            >
              {actionError}
            </div>
          ) : null}
          {actionNotice ? (
            <div
              role="status"
              className="mb-4 flex items-center gap-2 rounded-2xl border border-white/20 bg-black/45 px-4 py-3 text-[12px] text-white backdrop-blur-md"
            >
              <CheckCircle2 size={16} className="text-white" aria-hidden="true" />
              {actionNotice}
            </div>
          ) : null}

          <div className="mb-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onNext}
              disabled={busyAction !== null}
              className="flex items-center justify-center gap-2 rounded-[20px] bg-white py-4 text-[13px] font-medium tracking-widest text-stone-900 shadow-xl transition-colors hover:bg-stone-100 disabled:opacity-60"
            >
              <Share2 size={16} strokeWidth={1.5} />
              {busyAction === "save" ? "保存中" : "保存方案"}
            </button>
            <button
              type="button"
              onClick={onDownload}
              disabled={downloading}
              className="flex items-center justify-center gap-2 rounded-[20px] border border-white/20 bg-white/10 px-3 py-4 text-white backdrop-blur-xl transition-colors hover:bg-white/20 disabled:opacity-60"
            >
              <Download size={18} strokeWidth={1.5} />
              <span className="text-[11px] font-medium tracking-wide">
                {downloading ? "下载中" : "下载高清图"}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onMarketing}
              disabled={busyAction !== null}
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
              disabled={busyAction !== null}
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
  customerName,
  planName,
  materialDescription,
  prompt,
  onEdit,
  customerTab,
  fidelity,
  imageUrl,
  socialCopy,
  customerScript,
  actionNotice,
  actionError,
  savedPlanId,
  downloading,
  onBack,
  onCustomerTabChange,
  onDownload,
  onOpenViewer,
}: {
  customerName: string;
  planName: string;
  materialDescription: string;
  prompt: string;
  onEdit: () => void;
  customerTab: CustomerTab;
  fidelity: Fidelity;
  imageUrl: string;
  socialCopy: string;
  customerScript: string;
  actionNotice: string;
  actionError: string;
  savedPlanId: string;
  downloading: boolean;
  onBack: () => void;
  onCustomerTabChange: (tab: CustomerTab) => void;
  onDownload: () => void;
  onOpenViewer: () => void;
}) {
  const fidelityLabel =
    fidelityOptions.find(([value]) => value === fidelity)?.[1] ?? "平衡";
  const displayImage = imageUrl;

  return (
    <div className="relative flex h-full flex-col">
      <StudioHeader
        title="方案展示"
        onBack={onBack}
        rightIcon={
          <button
            type="button"
            onClick={onEdit}
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

      {actionNotice ? (
        <div
          role="status"
          data-plan-id={savedPlanId || undefined}
          className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-2xl border border-sage/15 bg-white/72 px-4 py-3 text-[12px] text-stone-700 shadow-sm"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-sage" aria-hidden="true" />
            {actionNotice}
          </span>
          {savedPlanId && actionNotice === "方案已保存" ? (
            <Link href="/plans" className="font-semibold text-sage underline-offset-4 hover:underline">
              查看客户方案
            </Link>
          ) : null}
        </div>
      ) : null}
      {actionError ? (
        <div
          role="alert"
          className="mx-4 mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700"
        >
          {actionError}
        </div>
      ) : null}

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
                  房间：{planName}窗帘方案
                </div>
                <div className="rounded-2xl bg-white/55 px-4 py-3">
                  样本：{materialDescription}
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
              <p className="mt-4 whitespace-pre-wrap text-[13px] leading-6 text-stone-600">{prompt}</p>
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

              <button
                type="button"
                aria-label="放大查看效果图"
                onClick={onOpenViewer}
                className="absolute right-3 top-3 grid size-11 place-items-center rounded-full bg-black/50 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/70"
              >
                <Maximize2 size={18} aria-hidden="true" />
              </button>

              <div className="absolute -bottom-4 right-6 flex flex-col items-center rounded-full border-2 border-white bg-sage px-5 py-2.5 text-white shadow-lg">
                <span className="mb-0.5 text-[10px] tracking-widest opacity-80">
                  方案状态
                </span>
                <span className="font-serif text-[13px]">{savedPlanId ? "已保存" : "待保存"}</span>
              </div>
            </motion.div>

            <div className="mt-10 space-y-8 px-2">
              <CopySection title="社交分享方案" text={socialCopy} />
              <CopySection title="客户沟通话术" text={customerScript} />
            </div>
          </>
        )}
      </div>

      <div className="studio-action-bar">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onDownload}
            disabled={downloading}
            className="studio-secondary-button flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Download size={16} aria-hidden="true" />
            {downloading ? "下载中" : "下载高清图"}
          </button>
          <Link href={savedPlanId ? `/plans/${savedPlanId}` : "/plans"} className="studio-primary-button flex items-center justify-center gap-2">查看已保存方案</Link>
        </div>
      </div>
    </div>
  );
}

function CopySection({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  const [notice, setNotice] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("已复制");
    } catch {
      setNotice("复制失败，请选中文案手动复制");
    }
  }
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="mb-3 flex items-end justify-between">
        <h3 className="font-serif text-[14px] text-stone-800">{title}</h3>
        <button
          type="button"
          aria-label={`复制${title}`}
          disabled={!text}
          onClick={copy}
          className="flex items-center gap-1 text-[10px] tracking-widest text-stone-400 transition-colors hover:text-sage"
        >
          <Copy size={12} />
          复制
        </button>
      </div>
      <div className="relative">
        <div className="absolute bottom-0 left-0 top-0 w-px bg-sand/50" />
        <p className="whitespace-pre-wrap pl-4 font-serif text-[13px] leading-relaxed text-stone-600">
          {text || "尚未生成文案，请返回效果页点击“生成营销文案”。"}
        </p>
        {notice ? <p role="status" className="mt-2 text-xs text-sage">{notice}</p> : null}
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
