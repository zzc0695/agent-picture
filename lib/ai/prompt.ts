import type OpenAI from "openai";
import { z } from "zod";
import { AiUnavailableError, parseJsonOutput } from "@/lib/ai/errors";
import {
  createBailianTextClient,
  extractChatCompletionText,
  getBailianConfig,
} from "@/lib/ai/bailian";
import { fidelitySchema } from "@/lib/validators";
import { geometryProtection } from "@/lib/prompt-templates";
import { curtainCraftGuide, curtainStyleDirection, samplePriorityGuide } from "@/lib/curtain-design";

type BailianChatRequest = OpenAI.ChatCompletionCreateParamsNonStreaming & {
  enable_thinking: boolean;
};

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
    "正向提示词应展开为约 350–550 字的具体设计说明，按风格目标、配色与层次、帘头与褶皱、面料与纹理、透光与垂坠、安装边界六个方面描述。用户已有具体细节必须保留，不为凑字数重复禁令或堆叠高级感、氛围感、8K等形容词。",
    curtainStyleDirection(input.userPrompt),
    curtainCraftGuide,
    samplePriorityGuide,
    "必须保留原房间结构、窗户位置、透视角度和主要光线方向。",
    geometryProtection,
    "润色仅针对窗帘，不把温馨、法式、现代等风格扩展为整屋装修。用户要求移动家具或改变空间时，优先保留原图布局。样本还原度仅作用于窗帘，不影响空间保护。",
    `样本还原度：${fidelityText[input.fidelity]}`,
    `商家样本信息：${input.materialSummary}`,
    `用户原始需求：${input.userPrompt}`,
    "只返回 JSON 对象，包含两个非空字符串：optimizedPrompt 为可直接编辑的正向提示词，negativePrompt 为负向提示词。正向提示词优先描述可见的成品效果，末尾用简洁一句保留空间；负向提示词集中描述家具移位、窗框变形、样本背景迁移、褶皱断裂、纹理平铺、塑料反光、穿模、全局换光和水印。不要在正向提示词中混入 JSON 或负向提示词。",
  ].join("\n");
}

export async function optimizePrompt(input: PromptInput) {
  fidelitySchema.parse(input.fidelity);
  const prompt = buildOptimizedPromptInput(input);

  const config = getBailianConfig();

  if (!config.apiKey) {
    throw new AiUnavailableError();
  }

  const request: BailianChatRequest = {
    model: config.textModel,
    messages: [{ role: "user", content: prompt }],
    enable_thinking: false,
    response_format: { type: "json_object" },
  };
  const response = await createBailianTextClient(
    config.apiKey,
  ).chat.completions.create(request);

  return z.object({
    optimizedPrompt: z.string().trim().min(1),
    negativePrompt: z.string().trim().min(1),
  }).parse(parseJsonOutput(extractChatCompletionText(response)));
}
