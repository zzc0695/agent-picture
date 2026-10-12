import { db } from "@/lib/db";
import { getBailianConfig, getBailianImageTask, submitBailianImage } from "./bailian";
import { prepareImageGeneration, persistEffectImage } from "./image";
import { AiUnavailableError, AiResourceNotFoundError, isPreRequestConnectionFailure } from "./errors";
import { imageGenerationRequestSchema } from "@/lib/validators";
import type { GenerationRecord } from "@prisma/client";
import { reserveUsage } from "@/lib/usage";

function view(job: GenerationRecord) {
  return { jobId: job.id, status: job.status, imageUrl: job.resultImageUrl, inputSummary: job.inputSummary,
    sourcePlanId: job.planId,
    input: job.inputData, error: job.failureReason, elapsedSeconds: Math.round((Date.now() - job.createdAt.getTime()) / 1000) };
}
export async function startImageJob(merchantId: string, body: unknown) {
  const input = imageGenerationRequestSchema.parse(body);
  input.materialIds = [...new Set([...input.materialIds, input.styleMaterialId, input.detailMaterialId].filter(Boolean))];
  if (input.planId && !await db.customerPlan.findFirst({ where: { id: input.planId, merchantId } })) throw new AiResourceNotFoundError("客户方案不存在");
  if (input.customerId && !await db.customer.findFirst({ where: { id: input.customerId, merchantId } })) throw new AiResourceNotFoundError("客户不存在");
  if (input.materialIds.length && await db.material.count({ where: { id: { in: input.materialIds }, merchantId } }) !== new Set(input.materialIds).size) throw new AiResourceNotFoundError("素材不存在");
  const job = await reserveUsage({ merchantId, planId: input.planId, type: "image_generation",
    inputSummary: input.fidelity + ": " + input.optimizedPrompt.slice(0, 120), inputData: input });
  const started = Date.now();
  let stage = "references";
  let referenceMs = 0;
  try {
    const { config, content } = await prepareImageGeneration(input, true);
    referenceMs = Date.now() - started;
    stage = "submission";
    const providerTaskId = await submitBailianImage(config.apiKey!, config.imageModel, content, { negativePrompt: input.negativePrompt });
    return view(await db.generationRecord.update({ where: { id: job.id }, data: {
      status: "running", providerTaskId, timings: { referenceMs, submissionMs: Date.now() - started - referenceMs } } }));
  } catch (error) {
    if (stage === "submission" && isPreRequestConnectionFailure(error)) {
      return view(await db.generationRecord.update({ where: { id: job.id }, data: { status: "submitting", leaseUntil: null,
        failureReason: "连接暂时失败，正在等待自动重试", timings: { stage: "connection", attempts: 1, nextAttemptAt: Date.now() + 10000, referenceMs } } }));
    }
    await db.generationRecord.update({ where: { id: job.id }, data: { status: "failed",
      failureReason: "参考图读取或任务提交失败，请检查图片后重试", timings: { stage, referenceMs, totalMs: Date.now() - started } } });
    console.error(JSON.stringify({ event: "image_job_failed", jobId: job.id, stage, elapsedMs: Date.now() - started,
      errorType: error instanceof Error ? error.name : "unknown",
      errorCode: error instanceof Error && error.cause && typeof error.cause === "object" && "code" in error.cause ? error.cause.code : undefined }));
    throw error;
  }
}
export async function pollImageJob(merchantId: string, id: string) {
  const job = await db.generationRecord.findFirst({ where: { id, merchantId, type: "image_generation" } });
  if (!job) return null;
  if (["succeeded", "failed"].includes(job.status)) return view(job);
  const age = Date.now() - job.createdAt.getTime();
  const timings = typeof job.timings === "object" && job.timings !== null && !Array.isArray(job.timings) ? job.timings : {};
  const waitingForConnection = job.status === "submitting" && timings.stage === "connection";
  if (age > 23 * 3600_000 || (job.status === "submitting" && age > (waitingForConnection ? 300_000 : 120_000))) {
    return view(await db.generationRecord.update({ where: { id }, data: { status: "failed", failureReason: "生成任务已过期，请重新生成" } }));
  }
  if (!job.providerTaskId) {
    if (!waitingForConnection || Number(timings.nextAttemptAt) > Date.now()) return view(job);
    const attempts = Number(timings.attempts || 1) + 1;
    if (attempts > 3) return view(await db.generationRecord.update({ where: { id }, data: { status: "failed", failureReason: "多次连接生图服务失败，请稍后重试。图片与要求已保留。" } }));
    const claimed = await db.generationRecord.updateMany({ where: { id, status: "submitting", OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] }, data: {
      leaseUntil: new Date(Date.now() + 90_000), timings: { ...timings, stage: "retry_sending", attempts } } });
    if (!claimed.count) return view(job);
    try {
      const input = imageGenerationRequestSchema.parse(job.inputData);
      const { config, content } = await prepareImageGeneration(input, true);
      const providerTaskId = await submitBailianImage(config.apiKey!, config.imageModel, content, { negativePrompt: input.negativePrompt });
      return view(await db.generationRecord.update({ where: { id }, data: { status: "running", providerTaskId, leaseUntil: null,
        failureReason: null, timings: { ...timings, stage: "model", attempts } } }));
    } catch (error) {
      const canRetry = isPreRequestConnectionFailure(error) && attempts < 3;
      return view(await db.generationRecord.update({ where: { id }, data: { status: canRetry ? "submitting" : "failed", leaseUntil: null,
        failureReason: canRetry ? "连接暂时失败，正在等待自动重试" : "生图服务提交失败，已停止自动重试。图片与要求已保留。",
        timings: { ...timings, stage: canRetry ? "connection" : "submission", attempts, nextAttemptAt: Date.now() + attempts * 10000 } } }));
    }
  }
  const config = getBailianConfig();
  if (!config.apiKey) throw new AiUnavailableError();
  const result = await getBailianImageTask(config.apiKey, job.providerTaskId);
  if (["FAILED", "CANCELED", "UNKNOWN"].includes(result.status)) {
    return view(await db.generationRecord.update({ where: { id }, data: { status: "failed",
      failureReason: "模型生成失败或任务已失效，请重新生成", timings: { totalMs: age, stage: "model" } } }));
  }
  if (result.status !== "SUCCEEDED") return view(job);
  const claimed = await db.generationRecord.updateMany({ where: { id, status: "running",
    OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] }, data: { leaseUntil: new Date(Date.now() + 90_000) } });
  if (!claimed.count) return view(job);
  const started = Date.now();
  try {
    const imageUrl = await persistEffectImage(result.imageUrl!);
    return view(await db.generationRecord.update({ where: { id }, data: { status: "succeeded", resultImageUrl: imageUrl,
      usageUnits: 1, leaseUntil: null, timings: {
        ...(typeof job.timings === "object" && job.timings !== null ? job.timings : {}), modelWaitMs: age,
        downloadAndStorageMs: Date.now() - started, totalMs: Date.now() - job.createdAt.getTime() } } }));
  } catch (error) {
    await db.generationRecord.update({ where: { id }, data: { leaseUntil: null } });
    console.error(JSON.stringify({ event: "image_job_result_retry", jobId: id, stage: "download_storage" }));
    throw error;
  }
}
