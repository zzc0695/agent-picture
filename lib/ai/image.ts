import OpenAI from "openai";
import { saveGeneratedImage } from "@/lib/files/storage";

export async function generateEffectImage(input: {
  roomImageUrl: string;
  sampleImageUrl: string;
  optimizedPrompt: string;
  negativePrompt: string;
  fidelity: string;
  referenceImageUrl?: string;
}) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      imageUrl: input.referenceImageUrl ?? input.roomImageUrl,
      inputSummary: `${input.fidelity}: ${input.optimizedPrompt.slice(0, 120)}`,
    };
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = [
    "生成一张真实摄影质感的软装效果图。",
    `生成要求：${input.optimizedPrompt}`,
    `负向要求：${input.negativePrompt}`,
    `样本还原度：${input.fidelity}`,
    `客户房间图参考路径：${input.roomImageUrl}`,
    `软装样本图参考路径：${input.sampleImageUrl}`,
    input.referenceImageUrl ? `当前效果参考路径：${input.referenceImageUrl}` : "",
    "必须保留原房间结构、窗户位置、透视角度和主要光线方向。",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.images.generate({
    model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1",
    prompt,
    n: 1,
    size: "1024x1024",
  });
  const imageBase64 = response.data?.[0]?.b64_json;
  if (!imageBase64) {
    throw new Error("图片生成接口没有返回图片数据");
  }
  const imageUrl = await saveGeneratedImage(Buffer.from(imageBase64, "base64"), "png");

  return {
    imageUrl,
    inputSummary: `${input.fidelity}: ${input.optimizedPrompt.slice(0, 120)}`,
  };
}
