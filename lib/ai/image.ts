import { geometryProtection, geometryNegativePrompt } from "@/lib/prompt-templates";
import {
  generateBailianImage,
  getBailianConfig,
  type BailianContentPart,
} from "@/lib/ai/bailian";
import { AiUnavailableError } from "@/lib/ai/errors";
import { describeRoomLayout } from "@/lib/ai/room-layout";
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
  spatialGuide?: string;
}, asyncMode = false) {
  const config = getBailianConfig();

  if (!config.apiKey) {
    throw new AiUnavailableError();
  }

  const baseImageUrl = input.roomImageUrl;
  const [references, size] = await Promise.all([Promise.all(
    [baseImageUrl, input.styleImageUrl, input.detailImageUrl].map(asyncMode ? toAsyncImageReference : toBailianImageReference),
  ), roomImageOutputSize(baseImageUrl)]);
  let spatialGuide = input.spatialGuide;
  if (!spatialGuide) {
    try { spatialGuide = await describeRoomLayout(references[0]); }
    catch { console.info(JSON.stringify({ event: "room_layout_observation_unavailable" })); }
  }
  const imageRoleText = "图1是原房间，图2是窗帘整体款式，图3是材质细节。图1是唯一的空间与家具布局基准；图2和图3仅提取窗帘，不复制其中的窗户、家具、摆件、背景装修或构图。";
  const prompt = [
    imageRoleText,
    "任务是对图1进行窗帘局部编辑，不是重新设计或重新拍摄房间。",
    geometryProtection,
    spatialGuide ?? "",
    "生成要求：" + input.optimizedPrompt.replaceAll(geometryProtection, "").trim(),
    "样本还原度：" + input.fidelity,
    input.imageAnalysis ? "图片识别摘要：" + input.imageAnalysis : "",
    "必须保留原房间结构、窗户位置、透视角度和主要光线方向。",
  ]
    .filter(Boolean)
    .join("\n");

  // Never chain generated rooms: even small layout errors would accumulate.
  const content: BailianContentPart[] = references.map((image) => ({ image }));

  content.push({ text: prompt });

  const negativePrompt = [geometryNegativePrompt, input.negativePrompt].filter(Boolean).join("，").slice(0, 500);
  return { config, content, negativePrompt, size, spatialGuide, inputSummary: input.fidelity + ": " + input.optimizedPrompt.slice(0, 120) };
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
