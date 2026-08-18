import {
  generateBailianImage,
  getBailianConfig,
  type BailianContentPart,
} from "@/lib/ai/bailian";
import {
  saveGeneratedImage,
  toBailianImageReference,
} from "@/lib/files/storage";

export async function generateEffectImage(input: {
  roomImageUrl: string;
  styleImageUrl: string;
  detailImageUrl: string;
  optimizedPrompt: string;
  negativePrompt: string;
  fidelity: string;
  imageAnalysis: string;
  referenceImageUrl?: string;
}) {
  const config = getBailianConfig();

  if (!config.apiKey) {
    return {
      imageUrl: input.referenceImageUrl ?? input.roomImageUrl,
      inputSummary: input.fidelity + ": " + input.optimizedPrompt.slice(0, 120),
    };
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
  const content: BailianContentPart[] = [
    { image: await toBailianImageReference(baseImageUrl) },
    { image: await toBailianImageReference(input.styleImageUrl) },
    { image: await toBailianImageReference(input.detailImageUrl) },
  ];

  content.push({ text: prompt });

  const temporaryImageUrl = await generateBailianImage(
    config.apiKey,
    config.imageModel,
    content,
    { negativePrompt: input.negativePrompt },
  );
  const imageResponse = await fetch(temporaryImageUrl);

  if (!imageResponse.ok) {
    throw new Error("无法下载图片生成结果");
  }

  const imageUrl = await saveGeneratedImage(
    Buffer.from(await imageResponse.arrayBuffer()),
    "png",
  );

  return {
    imageUrl,
    inputSummary: input.fidelity + ": " + input.optimizedPrompt.slice(0, 120),
  };
}
