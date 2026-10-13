"use client";


import { PreviewImage } from "@/components/preview-image";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Download, Image as ImageIcon, RefreshCw, Sparkles, UploadCloud } from "lucide-react";
import { MaterialPicker } from "@/components/material-picker";
import { PhotoAssist } from "@/components/photo-assist";
import type { SupplementalImage } from "@/lib/photo-types";
import { curtainCraftGuide } from "@/lib/curtain-design";

const roomPrompt =
  "保留原房间的结构、家具、窗户位置和光线方向，仅调整窗帘。款式图决定帘头、褶皱、层次和配色，材质近照决定织纹、图案、光泽与垂感。准确呈现参考窗帘从顶部收束到下方自然展开的形态，布纱层次清楚，色彩以样本为准，成品像在同一房间完成窗帘安装后的真实照片。\n\n" + curtainCraftGuide;

const materialSummary = "请参考商家上传的款式与材质图片；未识别的颜色、成分及遮光性能不作断言。";
const demoRoomImageUrl =
  "/demo/living-room.png";
const demoSampleImageUrl =
  "/demo/curtain-fabric.png";
const demoDetailImageUrl =
  "/demo/curtain-fabric.png";

type Fidelity = "strict" | "balanced" | "creative";
type MaterialAnalysis = {
  roomSummary: string;
  styleSummary: string;
  materialSummary: string;
  templatePrompt: string;
};

export default function WorkbenchPage() {
  const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [sourcePlan, setSourcePlan] = useState<{ id: string; imageUrl: string } | null>(null);
  const [materialIds, setMaterialIds] = useState<string[]>([]);
  const materialSlots = useRef({ style: "", detail: "" });
  const [planName, setPlanName] = useState("客厅");
  const [prompt, setPrompt] = useState(roomPrompt);
  const [originalPrompt, setOriginalPrompt] = useState(roomPrompt);
  const [negativePrompt, setNegativePrompt] = useState("");
  const [fidelity, setFidelity] = useState<Fidelity>("balanced");
  const [roomImageUrl, setRoomImageUrl] = useState(demoRoomImageUrl);
  const [styleImageUrl, setStyleImageUrl] = useState(demoSampleImageUrl);
  const [detailImageUrl, setDetailImageUrl] = useState(demoDetailImageUrl);
  const [supplementalImages,setSupplementalImages]=useState<SupplementalImage[]>([]);
  const [supplementUploading,setSupplementUploading]=useState(false);
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
  const [downloading, setDownloading] = useState(false);
  const resultRef = useRef<HTMLElement>(null);
  const [deliveryUrl, setDeliveryUrl] = useState("");
  const [uploads, setUploads] = useState<Record<string, boolean>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const uploadLocks = useRef(new Set<string>());
  const previewUrls = useRef<Record<string,string>>({});
  useEffect(() => () => { Object.values(previewUrls.current).forEach(url => URL.revokeObjectURL(url)); }, []);
  const uploading = Object.values(uploads).some(Boolean) || supplementUploading;
  const inputReady = Boolean(roomImageUrl && styleImageUrl && detailImageUrl) && !uploading;

  useEffect(() => {
    let stopped = false;
    void fetch("/api/customers").then(response => response.ok ? response.json() : null).then(result => { if (!stopped && result?.customers) setCustomers(result.customers); }).catch(() => undefined);
    return () => { stopped = true; };
  }, []);

  useEffect(() => {
    let stopped = false;
    const query = new URLSearchParams(window.location.search);
    const planId = query.get("planId");
    if (planId && !query.get("jobId") && !localStorage.getItem("image-generation-job")) {
      void fetch(`/api/plans/${encodeURIComponent(planId)}`).then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error || "无法打开方案"); return result.plan; }).then(plan => {
        if (stopped) return;
        setSourcePlan({ id: plan.id, imageUrl: plan.primaryImageUrl || "" });
        setCustomerId(plan.customerId || ""); setCustomerName(plan.customerName); setPlanName((plan.notes || "新版本").slice(0, 180));
        setRoomImageUrl(plan.roomImageUrl); setStyleImageUrl(plan.styleImageUrl || plan.sampleImageUrl); setDetailImageUrl(plan.detailImageUrl || plan.sampleImageUrl);
        setPrompt(plan.optimizedPrompt || plan.originalPrompt); setOriginalPrompt(plan.originalPrompt); setNegativePrompt(plan.negativePrompt); setFidelity(plan.fidelity);
        setImageAnalysis(plan.imageAnalysis ? JSON.parse(plan.imageAnalysis) : null);
        setSupplementalImages(plan.imageAnalysis ? JSON.parse(plan.imageAnalysis).supplementalImages || [] : []);
        setMaterialIds(plan.materials?.map((item: { materialId: string }) => item.materialId) || []);
        materialSlots.current = { style: plan.materials?.find((item: { material: { imageUrl: string } }) => item.material.imageUrl === plan.styleImageUrl)?.materialId || "", detail: plan.materials?.find((item: { material: { imageUrl: string } }) => item.material.imageUrl === plan.detailImageUrl)?.materialId || "" };
        setActionNotice("已载入原方案。修改要求后生成，新结果会另存为新方案。");
      }).catch(error => { if (!stopped) setActionError(error.message); });
      return () => { stopped = true; };
    }
    const saved = query.get("jobId") || localStorage.getItem("image-generation-job") || (query.has("new") ? null : localStorage.getItem("last-image-result"));
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
          setSupplementalImages(job.input.supplementalImages || []);
          setPrompt(job.effectivePrompt || job.input.optimizedPrompt); setOriginalPrompt(job.input.originalPrompt || job.input.optimizedPrompt);
          setNegativePrompt(job.input.negativePrompt || ""); setFidelity(job.input.fidelity);
          setImageAnalysis(job.input.imageAnalysis ? JSON.parse(job.input.imageAnalysis) : null);
          if (job.input.customerName) setCustomerName(job.input.customerName);
          if (job.input.planName) setPlanName(job.input.planName);
          setCustomerId(job.input.customerId || ""); setMaterialIds(job.input.materialIds || []);
          materialSlots.current = { style: job.input.styleMaterialId || "", detail: job.input.detailMaterialId || "" };
          const sourceId = job.sourcePlanId === undefined ? job.input.planId : job.sourcePlanId;
          setSourcePlan(sourceId ? { id: sourceId, imageUrl: job.input.referenceImageUrl || "" } : null);
          clearResult(); restored = true;
        }
        if (job.status === "failed") throw new Error(job.error || "生成失败，请重试");
        if (job.status === "succeeded") {
          if (!job.imageUrl) throw new Error("未收到效果图");
          clearResult(); setImageUrl(job.imageUrl); localStorage.setItem("last-image-result", imageJobId);
          localStorage.removeItem("image-generation-job"); setImageJobId(""); setBusyAction(null); return;
        }
        setActionNotice(job.status === "submitting" ? `正在连接生图服务，网络暂时不通时会有限自动重试，已等待 ${job.elapsedSeconds || 0} 秒。` : `效果图正在生成，已等待 ${job.elapsedSeconds || 0} 秒。可以刷新页面后继续查看。`);
        timer = setTimeout(poll, 5000);
    } catch (error) {
        if (stopped) return;
        if (error instanceof TypeError) { timer = setTimeout(poll, 10000); return; }
        setActionError(error instanceof Error ? error.message : "查询失败");
        localStorage.removeItem("image-generation-job"); setImageJobId(""); setBusyAction(null);
        localStorage.removeItem("last-image-result");
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
    setDeliveryUrl("");
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
    if (imageUrl) scrollToResult(resultRef.current);
  }, [imageUrl]);

  useEffect(() => {
    if (busyAction === "generate") scrollToResult(resultRef.current);
  }, [busyAction]);

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
    if (busyAction || !inputReady || !prompt.trim()) return;
    setBusyAction("optimize");
    setActionError("");
    try {
      const result = await postJson<{
        optimizedPrompt: string;
        negativePrompt: string;
      }>("/api/ai/optimize-prompt", {
        userPrompt: prompt,
        roomImageUrl,
        styleImageUrl,
        detailImageUrl,
        supplementalImages,
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
    if (busyAction || uploadLocks.current.has(target)) return;
    uploadLocks.current.add(target);
    setUploads(current => ({ ...current, [target]: true }));
    const preview = URL.createObjectURL(file);
    if (previewUrls.current[target]) URL.revokeObjectURL(previewUrls.current[target]);
    previewUrls.current[target] = preview;
    setPreviews(current => ({ ...current, [target]: preview }));
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
        setSourcePlan(current => current ? { ...current, imageUrl: "" } : null);
      } else if (target === "style") {
        setStyleImageUrl(result.url);
        materialSlots.current.style = "";
      } else {
        setDetailImageUrl(result.url);
        materialSlots.current.detail = "";
      }
      setMaterialIds([...new Set(Object.values(materialSlots.current).filter(Boolean))]);
      setImageAnalysis(null);
      setAnalysisError("");
      setNegativePrompt("");
      clearResult();
    } catch (error) {
      setPreviews(current => ({ ...current, [target]: "" }));
      setUploadError((target === "room" ? "房间" : target === "style" ? "款式" : "面料") + "图片上传失败：" + (error instanceof Error ? error.message : "请重试"));
    } finally {
      uploadLocks.current.delete(target);
      setUploads(current => ({ ...current, [target]: false }));
    }
  }

  async function analyzeUploadedImages() {
    if (busyAction || !inputReady) return;
    setBusyAction("analyze");
    setAnalysisError("");
    try {
      const result = await postJson<MaterialAnalysis>(
        "/api/ai/analyze-materials",
        { roomImageUrl, styleImageUrl, detailImageUrl, supplementalImages },
      );
      setImageAnalysis(result);
      updatePrompt(result.templatePrompt);
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
      const result = await postJson<{ jobId: string; effectivePrompt?: string }>(
        "/api/ai/generate-image",
        {
          roomImageUrl,
          styleImageUrl,
          detailImageUrl,
        supplementalImages,
          optimizedPrompt: prompt,
          negativePrompt,
          fidelity,
          imageAnalysis: imageAnalysis ? JSON.stringify(imageAnalysis) : "",
          referenceImageUrl: referenceImageUrl || sourcePlan?.imageUrl || undefined,
          planId: sourcePlan?.id,
          customerId: customerId || null, customerName, planName, materialIds, originalPrompt,
          styleMaterialId: materialSlots.current.style, detailMaterialId: materialSlots.current.detail,
        },
      );
      if (!result.jobId) throw new Error("未收到任务编号，请重试");
      if (result.effectivePrompt) setPrompt(result.effectivePrompt);
      clearResult();
      localStorage.setItem("image-generation-job", result.jobId);
      window.history.replaceState(null, "", `/?jobId=${encodeURIComponent(result.jobId)}`);
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
    setActionNotice("");
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
      setDeliveryUrl("");
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
      return;
    }
    setBusyAction("save");
    setActionError("");
    setActionNotice("");
    try {
      const result = await postJson<{ plan: { id: string } }>("/api/plans", {
        sourcePlanId: sourcePlan?.id || null,
        customerId: customers.some(customer => customer.id === customerId) ? customerId : null,
        customerName: customerName.trim() || "未命名客户",
        notes: sourcePlan ? `${planName.trim()} · 新版本` : `${planName.trim()}窗帘方案`,
        roomImageUrl,
        sampleImageUrl: styleImageUrl,
        styleImageUrl,
        detailImageUrl,
        supplementalImages,
        imageAnalysis: JSON.stringify({...imageAnalysis,supplementalImages}),
        originalPrompt,
        optimizedPrompt: prompt,
        negativePrompt,
        fidelity,
        primaryImageUrl: imageUrl,
        shortVideoScript,
        socialCopy,
        customerScript,
        status: "ready",
        materialIds,
      });
      setSavedPlanId(result.plan.id);
      setActionNotice("方案已保存");
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


  async function copyDelivery() {
    if (busyAction || !savedPlanId) return;
    setBusyAction("share"); setActionError("");
    try {
      const share = await postJson<{ path: string }>(`/api/plans/${savedPlanId}/share`, {});
      const url = window.location.origin + share.path; setDeliveryUrl(url);
      try { await navigator.clipboard.writeText(url); setActionNotice("客户链接已复制，有效期 7 天"); }
      catch { setActionNotice("交付链接已生成，可在下方长按或选中复制"); }
    } catch (reason) { setActionError(reason instanceof Error ? reason.message : "链接创建失败，请重试"); }
    finally { setBusyAction(null); }
  }

  const busy = busyAction !== null || uploading;
  const previewUrl = imageUrl || sourcePlan?.imageUrl;
  function updateCustomer(value: string) {
    setCustomerName(value); setSavedPlanId(""); setDeliveryUrl("");
    setShortVideoScript(""); setSocialCopy(""); setCustomerScript("");
  }

  return <div className="simple-workbench">
    <header className="workbench-heading">
      <div><h1 className="text-2xl font-semibold text-stone-900">制作窗帘方案</h1><p className="mt-2 text-sm text-stone-500">上传图片，写下要求，直接生成并保存。</p></div>
      <button disabled={busy} className="studio-secondary-button px-4" onClick={() => { localStorage.removeItem("last-image-result"); window.location.href = "/?new=1"; }}>新建方案</button>
    </header>
    {sourcePlan && <p className="mb-5 text-sm text-stone-600">正在调整已有方案，保存时会保留原方案并另存新版本。 <Link href={`/plans/${sourcePlan.id}`} className="text-sage underline">查看原方案</Link></p>}
    {actionError && <p role="alert" className="workbench-message mb-5 border-red-200 bg-red-50 text-red-700">{actionError}</p>}
    {actionNotice && busyAction !== "generate" && <p role="status" className="workbench-message mb-5 border-sage/20 bg-sage/5 text-sage">{actionNotice}</p>}

    <div className="workbench-grid">
      <section className="studio-card space-y-6 p-5 sm:p-6">
        <div><h2 className="text-lg font-semibold text-stone-900">图片与要求</h2><p className="mt-2 text-xs leading-6 text-stone-500">房间尽量拍到完整窗户；款式拍到帘头和下摆；面料靠近拍、关掉滤镜。每张不超过4MB。</p></div>
        <div className="grid grid-cols-3 gap-3">
          <UploadSlot title="房间图片" url={previews.room || roomImageUrl} busy={busyAction !== null || Boolean(uploads.room)} uploading={Boolean(uploads.room)} onUpload={file => void uploadImage(file, "room")} />
          <UploadSlot title="款式图片" url={previews.style || styleImageUrl} busy={busyAction !== null || Boolean(uploads.style)} uploading={Boolean(uploads.style)} onUpload={file => void uploadImage(file, "style")} />
          <UploadSlot title="面料图片" url={previews.detail || detailImageUrl} busy={busyAction !== null || Boolean(uploads.detail)} uploading={Boolean(uploads.detail)} onUpload={file => void uploadImage(file, "detail")} />
        </div>
        {[roomImageUrl, styleImageUrl, detailImageUrl].every(url => url.startsWith("/demo/")) && <p className="text-xs text-stone-500">已放入示例图，可以直接体验；点击图片换成自己的样本。</p>}
        <PhotoAssist primary={[{url:roomImageUrl,role:"room"},{url:styleImageUrl,role:"style"},{url:detailImageUrl,role:"detail"}]} photos={supplementalImages} disabled={busyAction !== null} onUploading={setSupplementUploading} onChange={photos=>{setSupplementalImages(photos);setNegativePrompt("");clearResult();}}/>
        {uploadError && <p role="alert" className="text-sm text-red-600">{uploadError}</p>}
        <label className="block text-sm font-medium text-stone-700">生成要求<textarea aria-label="生成要求" rows={5} value={prompt} disabled={busyAction !== null} onChange={event => updatePrompt(event.target.value)} placeholder="例如：保留房间布局，换成浅灰色双层窗帘。" className="workbench-input mt-3 resize-y leading-7" /></label>
        <details className="workbench-options">
          <summary className="cursor-pointer text-sm text-sage">更多选项：素材库、识别与还原度</summary>
          <div className="mt-5 space-y-4">
            <MaterialPicker disabled={busy} styleImageUrl={styleImageUrl} detailImageUrl={detailImageUrl} onSelect={(id, url, role) => { setPreviews(current => ({ ...current, [role]: "" })); if (role === "style") setStyleImageUrl(url); else setDetailImageUrl(url); materialSlots.current[role] = id; setMaterialIds([...new Set(Object.values(materialSlots.current).filter(Boolean))]); setImageAnalysis(null); setNegativePrompt(""); setAnalysisError(""); clearResult(); }} />
            <label className="block text-sm text-stone-700">样本还原度<select className="workbench-input mt-2" value={fidelity} disabled={busy} onChange={event => { setFidelity(event.target.value as Fidelity); setNegativePrompt(""); clearResult(); }}><option value="balanced">平衡（默认）</option><option value="strict">严格还原</option><option value="creative">创意发挥</option></select></label>
            <div className="flex flex-wrap gap-3"><button disabled={busy || !inputReady} onClick={() => void analyzeUploadedImages()} className="studio-secondary-button px-4">{busyAction === "analyze" ? "识别中..." : "识别图片补充要求"}</button><button disabled={busy || !inputReady || !prompt.trim()} onClick={() => void optimizePrompt()} className="studio-secondary-button px-4">{busyAction === "optimize" ? "润色中..." : "AI 润色要求"}</button></div>
            {analysisError && <p role="alert" className="text-sm text-red-600">{analysisError}</p>}
            {imageAnalysis && <p className="text-xs leading-6 text-stone-500">{imageAnalysis.materialSummary}</p>}
          </div>
        </details>
        <button className="studio-primary-button flex w-full items-center justify-center gap-2 px-5" disabled={busy || !inputReady || !prompt.trim()} onClick={() => void generateImage(imageUrl || undefined)}>{busyAction === "generate" ? <RefreshCw size={17} className="workbench-spin" aria-hidden="true" /> : <Sparkles size={17} aria-hidden="true" />}<span key={imageUrl ? "again" : "generate"} className="workbench-label">{busyAction === "generate" ? "正在生成..." : imageUrl ? "再生成一版" : "生成效果图"}</span></button>
      </section>

      <section ref={resultRef} className="studio-card space-y-5 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-stone-900">{imageUrl ? "效果图" : sourcePlan?.imageUrl ? "原方案效果图" : "生成结果"}</h2><Link href="/records" className="text-xs text-sage underline">找回历史结果</Link></div>
        {busyAction === "generate" && <div className="space-y-3"><p role="status" className="flex items-center gap-2 text-sm leading-6 text-sage"><RefreshCw size={16} className="workbench-spin" aria-hidden="true" />{actionNotice || "图片正在生成，可以关闭页面后从记录中找回。"}</p><div className="workbench-progress" aria-hidden="true" /></div>}
        {previewUrl ? <a href={previewUrl} target="_blank" rel="noreferrer" aria-label="打开完整效果图"><PreviewImage key={previewUrl} loading="eager" src={previewUrl} alt={imageUrl ? "生成效果图" : "原方案效果图"} className="workbench-preview" /></a> : <div className="workbench-empty"><ImageIcon size={34} strokeWidth={1.4} /><p className="mt-4 text-sm">效果图会显示在这里</p><p className="mt-2 text-xs">生成后可以下载、保存和交付客户。</p></div>}
        {!imageUrl && <section className="workbench-options" aria-label="宣传文案"><h3 className="text-base font-semibold text-stone-900">宣传文案</h3><p className="mt-2 text-sm leading-6 text-stone-500">先生成效果图，再制作短视频脚本、朋友圈文案和客户方案说明。</p><button disabled className="studio-secondary-button mt-4 px-4">生成营销文案</button></section>}
        {imageUrl && <>
          <div className="flex flex-wrap items-center gap-4"><button disabled={downloading} onClick={() => void downloadImage()} className="inline-flex items-center gap-2 text-sm text-sage"><Download size={16} />{downloading ? "下载中..." : "下载图片"}</button><details className="text-sm"><summary className="cursor-pointer text-stone-600">查看原图对比</summary><PreviewImage src={roomImageUrl} alt="客户空间原图" className="mt-3 max-h-64 w-full rounded-xl object-contain" /></details></div>
          <p className="text-xs leading-6 text-stone-500">效果图用于搭配沟通，实际颜色、尺寸与安装效果请结合样本确认。</p>
          <div className="space-y-4 border-t border-stone-200 pt-5">
            {customers.length > 0 && <label className="block text-sm text-stone-700">关联已有客户（选填）<select className="workbench-input mt-2" value={customerId} disabled={busy} onChange={event => { setCustomerId(event.target.value); updateCustomer(customers.find(customer => customer.id === event.target.value)?.name || ""); }}><option value="">暂不关联</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>}
            <div className="grid grid-cols-2 gap-3"><label className="text-sm text-stone-700">客户称呼<input aria-label="客户称呼" value={customerName} placeholder="选填" maxLength={80} disabled={busy || Boolean(customerId)} onChange={event => updateCustomer(event.target.value)} className="workbench-input mt-2" /></label><label className="text-sm text-stone-700">房间名称<input aria-label="房间名称" value={planName} placeholder="客厅" maxLength={160} disabled={busy} onChange={event => { setPlanName(event.target.value); setSavedPlanId(""); setDeliveryUrl(""); }} className="workbench-input mt-2" /></label></div>
            <section className="workbench-options" aria-label="宣传文案"><h3 className="text-base font-semibold text-stone-900">宣传文案</h3><p className="mt-2 text-xs leading-6 text-stone-500">生成短视频脚本、朋友圈文案和客户方案说明。</p><div className="mt-4 space-y-4"><button disabled={busy} className="studio-secondary-button px-4" onClick={() => void generateMarketing()}>{busyAction === "marketing" ? "文案生成中..." : "生成营销文案"}</button>{[["短视频脚本",shortVideoScript],["社交文案",socialCopy],["客户方案说明",customerScript]].map(([title,copy]) => copy && <div key={title}><h3 className="text-sm font-medium text-stone-700">{title}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-stone-600">{copy}</p></div>)}</div></section>
            <button disabled={busy} className="studio-primary-button w-full px-5" onClick={() => void (savedPlanId ? copyDelivery() : savePlan())}><span key={savedPlanId ? "share" : "save"} className="workbench-label inline-block">{busyAction === "save" ? "保存中..." : busyAction === "share" ? "正在创建链接..." : savedPlanId ? "复制客户链接" : "保存方案"}</span></button>
            {savedPlanId && <Link href={`/plans/${savedPlanId}`} className="block text-center text-sm text-sage underline">查看已保存方案</Link>}
            {deliveryUrl && <label className="block text-xs text-stone-500">客户交付链接<input aria-label="客户交付链接" readOnly value={deliveryUrl} onFocus={event => event.target.select()} className="workbench-input mt-2 text-xs" /></label>}
          </div>
        </>}
      </section>
    </div>
  </div>;
}

function scrollToResult(element: HTMLElement | null) {
  if (window.innerWidth < 1100) element?.scrollIntoView?.({ behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth", block: "start" });
}

function UploadSlot({ title, url, busy, uploading, onUpload }: { title: string; url: string; busy: boolean; uploading: boolean; onUpload: (file: File) => void }) {
  return <label className={`workbench-upload ${busy ? "opacity-60" : "cursor-pointer"}`}><span className="text-xs font-medium text-stone-700">{title}</span><div className="mt-2 aspect-square overflow-hidden rounded-xl border border-stone-200 bg-stone-50">{url ? <PreviewImage sizes="(max-width: 640px) 30vw, 180px" src={url} alt={title} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-stone-400"><UploadCloud size={24} /></div>}</div><span className="mt-2 block text-center text-xs text-sage">{uploading ? "上传中..." : url ? "点击更换" : "选择图片"}</span><input aria-label={`上传${title}`} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} className="sr-only" onChange={event => { const file = event.target.files?.[0]; if (file) onUpload(file); event.target.value=""; }} /></label>;
}
