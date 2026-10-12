import { db } from "@/lib/db";
import { getBailianConfig, getBailianImageTask, submitBailianImage } from "./bailian";
import { prepareImageGeneration, persistEffectImage } from "./image";
import { AiUnavailableError, AiResourceNotFoundError } from "./errors";
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
  if (age > 23 * 3600_000 || (job.status === "submitting" && age > 120_000)) {
    return view(await db.generationRecord.update({ where: { id }, data: { status: "failed", failureReason: "生成任务已过期，请重新生成" } }));
  }
  if (!job.providerTaskId) return view(job);
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
