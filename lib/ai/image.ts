import {
  generateBailianImage,
  getBailianConfig,
  type BailianContentPart,
} from "@/lib/ai/bailian";
import { AiUnavailableError } from "@/lib/ai/errors";
import {
  saveGeneratedImage,
  toBailianImageReference,
  toAsyncImageReference,
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
}, asyncMode = false) {
  const config = getBailianConfig();

  if (!config.apiKey) {
    throw new AiUnavailableError();
  }

  const imageRoleText = input.referenceImageUrl
    ? "图1是当前效果图，作为空间结构与构图基础；图2是窗帘整体款式；图3是材质细节。"
    : "图1是原房间，图2是窗帘整体款式，图3是材质细节。";
  const prompt = [
    imageRoleText,
    "生成一张真实摄影质感的软装效果图。",
    "生成要求：" + input.optimizedPrompt,
    "样本还原度：" + input.fidelity,
    input.imageAnalysis ? "图片识别摘要：" + input.imageAnalysis : "",
    "必须保留原房间结构、窗户位置、透视角度和主要光线方向。",
  ]
    .filter(Boolean)
    .join("\n");

  const baseImageUrl = input.referenceImageUrl ?? input.roomImageUrl;
  const references = await Promise.all(
    [baseImageUrl, input.styleImageUrl, input.detailImageUrl].map(asyncMode ? toAsyncImageReference : toBailianImageReference),
  );
  const content: BailianContentPart[] = references.map((image) => ({ image }));

  content.push({ text: prompt });

  return { config, content, inputSummary: input.fidelity + ": " + input.optimizedPrompt.slice(0, 120) };
}

export async function persistEffectImage(temporaryImageUrl: string) {
  const imageResponse = await fetch(temporaryImageUrl, { signal: AbortSignal.timeout(30_000) });
  if (!imageResponse.ok || !imageResponse.headers.get("content-type")?.startsWith("image/")) {
    throw new Error("无法下载图片生成结果");
  }
  return saveGeneratedImage(Buffer.from(await imageResponse.arrayBuffer()), "png");
}

export async function generateEffectImage(input: Parameters<typeof prepareImageGeneration>[0]) {
  const { config, content, inputSummary } = await prepareImageGeneration(input);
  const temporaryImageUrl = await generateBailianImage(
    config.apiKey!,
    config.imageModel,
    content,
    { negativePrompt: input.negativePrompt },
  );
  const imageUrl = await persistEffectImage(temporaryImageUrl);

  return {
    imageUrl,
    inputSummary,
  };
}
