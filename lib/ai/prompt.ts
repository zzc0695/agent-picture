import {
  createBailianTextClient,
  extractChatCompletionText,
  getBailianConfig,
} from "@/lib/ai/bailian";
import { fidelitySchema } from "@/lib/validators";

type PromptInput = {
  userPrompt: string;
  fidelity: "strict" | "balanced" | "creative";
  materialSummary: string;
};

const fidelityText = {
  strict: "严格还原样本图的颜色、纹理、款式、褶皱和材质特征。",
  balanced: "保留样本主要风格和颜色，并根据房间光线自然适配。",
  creative: "把样本作为风格灵感，允许更强氛围化表达。",
};

export function buildOptimizedPromptInput(input: PromptInput) {
  return [
    "请把以下软装效果图需求优化成适合图像生成模型使用的中文提示词。",
    "必须保留原房间结构、窗户位置、透视角度和主要光线方向。",
    `样本还原度：${fidelityText[input.fidelity]}`,
    `商家样本信息：${input.materialSummary}`,
    `用户原始需求：${input.userPrompt}`,
    "请输出：正向提示词、负向提示词。负向提示词需避免窗户变形、房间结构变化、窗帘位置错误、花纹跑偏、渲染不真实。",
  ].join("\n");
}

export async function optimizePrompt(input: PromptInput) {
  fidelitySchema.parse(input.fidelity);
  const prompt = buildOptimizedPromptInput(input);

  const config = getBailianConfig();

  if (!config.apiKey) {
    return {
      optimizedPrompt: `${input.userPrompt}。保留原房间结构、窗户位置、透视角度，${fidelityText[input.fidelity]}真实摄影质感。`,
      negativePrompt:
        "避免窗户变形、房间结构变化、窗帘位置错误、花纹跑偏、渲染不真实。",
    };
  }

  const response = await createBailianTextClient(
    config.apiKey,
  ).chat.completions.create({
    model: config.textModel,
    messages: [{ role: "user", content: prompt }],
  });

  return {
    optimizedPrompt: extractChatCompletionText(response),
    negativePrompt:
      "避免窗户变形、房间结构变化、窗帘位置错误、花纹跑偏、渲染不真实。",
  };
}
