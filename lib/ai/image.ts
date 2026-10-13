import { geometryProtection, geometryNegativePrompt } from "@/lib/prompt-templates";
import {
  generateBailianImage,
  getBailianConfig,
  type BailianContentPart,
} from "@/lib/ai/bailian";
import { AiUnavailableError } from "@/lib/ai/errors";
import { createGroundedPrompt } from "@/lib/ai/grounded-prompt";
import { sampleObservationGuide, sampleExclusionNegative } from "@/lib/ai/sample-observation";
import type { SupplementalImage } from "@/lib/photo-types";
import {
  saveGeneratedImage,
  toBailianImageReference,
  toAsyncImageReference,
  roomImageOutputSize,
} from "@/lib/files/storage";

export async function prepareImageGeneration(input: {
  roomImageUrl: string;
  styleImageUrl: string;
  detailImageUrl: string;
  optimizedPrompt: string;
  negativePrompt: string;
  fidelity: string;
  imageAnalysis: string;
  referenceImageUrl?: string;
  groundedPrompt?: string;
  supplementalImages?: SupplementalImage[];
}, asyncMode = false) {
  const config = getBailianConfig();

  if (!config.apiKey) {
    throw new AiUnavailableError();
  }

  const baseImageUrl = input.roomImageUrl;
  const [references, size] = await Promise.all([Promise.all(
    [baseImageUrl, input.styleImageUrl, input.detailImageUrl].map(asyncMode ? toAsyncImageReference : toBailianImageReference),
  ), roomImageOutputSize(baseImageUrl)]);
  const supplements = input.supplementalImages ?? [];
  const extraReferences = input.groundedPrompt ? [] : await Promise.all(supplements.map(photo => toAsyncImageReference(photo.url)));
  const observed = input.groundedPrompt ? null : await createGroundedPrompt([...references,...extraReferences], input.optimizedPrompt, input.fidelity as "strict" | "balanced" | "creative", supplements.map(photo => photo.role));
  const groundedPrompt = input.groundedPrompt ?? observed!.optimizedPrompt;
  const spatialGuide = observed ? `实际图片识别：\n房间：${observed.roomSummary}\n款式：${observed.styleSummary}\n材质：${observed.materialSummary}` : "";
  const imageRoleText = "图1是原房间，图2是窗帘整体款式，图3是材质细节。图1是唯一的空间与家具布局基准；图2和图3仅提取窗帘，不复制其中的窗户、家具、摆件、背景装修或构图。";
  const prompt = [
    imageRoleText,
    "任务是对图1进行窗帘局部编辑，不是重新设计或重新拍摄房间。",
    geometryProtection,
    sampleObservationGuide,
    spatialGuide ?? "",
    "依据实际图片形成的生成要求：" + groundedPrompt.replaceAll(geometryProtection, "").trim(),
    "样本还原度：" + input.fidelity,
    "必须保留原房间结构、窗户位置、透视角度和主要光线方向。",
  ]
    .filter(Boolean)
    .join("\n");

  // Never chain generated rooms: even small layout errors would accumulate.
  const content: BailianContentPart[] = references.map((image) => ({ image }));

  content.push({ text: prompt });

  const negativePrompt = [geometryNegativePrompt, sampleExclusionNegative, observed?.negativePrompt, input.negativePrompt].filter(Boolean).join("，").slice(0, 500);
  return { config, content, negativePrompt, size, groundedPrompt, inputSummary: input.fidelity + ": " + groundedPrompt.slice(0, 120) };
}

export async function persistEffectImage(temporaryImageUrl: string) {
  const imageResponse = await fetch(temporaryImageUrl, { signal: AbortSignal.timeout(30_000) });
  if (!imageResponse.ok || !imageResponse.headers.get("content-type")?.startsWith("image/")) {
    throw new Error("无法下载图片生成结果");
  }
  return saveGeneratedImage(Buffer.from(await imageResponse.arrayBuffer()), "png");
}

export async function generateEffectImage(input: Parameters<typeof prepareImageGeneration>[0]) {
  const { config, content, negativePrompt, size, inputSummary } = await prepareImageGeneration(input);
  const temporaryImageUrl = await generateBailianImage(
    config.apiKey!,
    config.imageModel,
    content,
    { negativePrompt, size },
  );
  const imageUrl = await persistEffectImage(temporaryImageUrl);

  return {
    imageUrl,
    inputSummary,
  };
}
