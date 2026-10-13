import { z } from "zod";
import { createBailianTextClient, extractChatCompletionText, getBailianConfig } from "./bailian";
import { parseJsonOutput } from "./errors";
import { buildOptimizedPromptInput } from "./prompt";

const resultSchema = z.object({
  roomSummary: z.string().trim().min(1).max(1200),
  styleSummary: z.string().trim().min(1).max(1200),
  materialSummary: z.string().trim().min(1).max(1200),
  optimizedPrompt: z.string().trim().min(30).max(5000),
  negativePrompt: z.string().trim().min(1).max(1000),
});

export async function createGroundedPrompt(references: string[], userPrompt: string, fidelity: "strict" | "balanced" | "creative") {
  const config = getBailianConfig();
  const instruction = [
    "必须先观察以下三张实际图片，再写提示词。图1是客户房间，图2是整体款式，图3是面料细节。",
    "先分别记录：roomSummary 描述实际窗户位置、安装范围、家具位置和前景遮挡；styleSummary 描述图2中实际可见的帘头、褶皱、层数、颜色和开合；materialSummary 描述图3实际颜色、纹理、图案和光泽。不确定的细节写无法确认，不把风格模板中的候选颜色或帘型当成识别事实。",
    buildOptimizedPromptInput({ userPrompt, fidelity, materialSummary: "必须以图2、图3的实际观察结果填写，不能以用户缓存摘要替代读图。" }),
    "然后依据上述观察和用户的明确修改要求写 optimizedPrompt。房间图决定位置和遮挡，款式图决定帘型，面料图决定材质外观；用户明确要求换色或换款时才针对相应属性调整。风格模板只提供表达方向，不能擅自给素色面料添加提花、把打孔帘改成捏褶或把单层改成双层。",
    "最终只返回一个 JSON 对象，包含 roomSummary、styleSummary、materialSummary、optimizedPrompt、negativePrompt 五个非空字符串。",
  ].join("\n");
  const response = await createBailianTextClient(config.apiKey!).chat.completions.create({
    model: config.textModel,
    messages: [{ role: "user", content: [
      ...references.map(url => ({ type: "image_url" as const, image_url: { url } })),
      { type: "text", text: instruction },
    ] }],
    response_format: { type: "json_object" },
    max_tokens: 1800,
    ...{ enable_thinking: false },
  }, { timeout: 25_000, maxRetries: 0 });
  const result = resultSchema.parse(parseJsonOutput(extractChatCompletionText(response)));
  console.info(JSON.stringify({ event: "image_grounded_prompt_created", imageCount: references.length }));
  return result;
}
