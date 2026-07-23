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
  sampleImageUrl: string;
  optimizedPrompt: string;
  negativePrompt: string;
  fidelity: string;
  referenceImageUrl?: string;
}) {
  const config = getBailianConfig();

  if (!config.apiKey) {
    return {
      imageUrl: input.referenceImageUrl ?? input.roomImageUrl,
      inputSummary: input.fidelity + ": " + input.optimizedPrompt.slice(0, 120),
    };
  }

  const prompt = [
    "生成一张真实摄影质感的软装效果图。",
    "生成要求：" + input.optimizedPrompt,
    "负向要求：" + input.negativePrompt,
    "样本还原度：" + input.fidelity,
    "必须保留原房间结构、窗户位置、透视角度和主要光线方向。",
  ]
    .filter(Boolean)
    .join("\n");

  const content: BailianContentPart[] = [
    { image: await toBailianImageReference(input.roomImageUrl) },
    { image: await toBailianImageReference(input.sampleImageUrl) },
  ];

  if (input.referenceImageUrl) {
    content.push({
      image: await toBailianImageReference(input.referenceImageUrl),
    });
  }

  content.push({ text: prompt });

  const temporaryImageUrl = await generateBailianImage(
    config.apiKey,
    config.imageModel,
    content,
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
