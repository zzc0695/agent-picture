import type OpenAI from "openai";
import {
  createBailianTextClient,
  extractChatCompletionText,
  getBailianConfig,
} from "@/lib/ai/bailian";
import { toBailianImageReference } from "@/lib/files/storage";
import {
  materialAnalysisRequestSchema,
  materialAnalysisResultSchema,
} from "@/lib/validators";

type MaterialAnalysisInput = {
  roomImageUrl: string;
  styleImageUrl: string;
  detailImageUrl: string;
};

type BailianVisionRequest = OpenAI.ChatCompletionCreateParamsNonStreaming & {
  enable_thinking: boolean;
};

const analysisInstruction = [
  "你是软装窗帘方案分析师。请严格按照图片顺序分析：图1是客户房间，图2是窗帘整体款式，图3是面料材质细节。",
  "识别房间类型、布局、窗户结构、光线和主色调；识别窗帘层次、褶皱、轨道和配色；识别面料颜色、纹理、厚度、遮光感和白纱特征。",
  "只返回 JSON 对象，不要返回 Markdown。必须包含四个非空字符串字段：roomSummary、styleSummary、materialSummary、templatePrompt。",
  "templatePrompt 必须是一段可直接编辑并用于生成真实软装效果图的中文文案，并明确要求保留原房间结构、窗户位置、透视和光线方向。",
].join("\n");

function parseAnalysisText(text: string) {
  const normalized = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return materialAnalysisResultSchema.parse(JSON.parse(normalized));
}

export async function analyzeMaterials(input: MaterialAnalysisInput) {
  const parsedInput = materialAnalysisRequestSchema.parse(input);
  const config = getBailianConfig();

  if (!config.apiKey) {
    return {
      roomSummary: "明亮的现代客厅，保留现有窗户结构、空间布局与自然光线。",
      styleSummary: "采用整体款式参考图中的窗帘层次、褶皱比例与配色关系。",
      materialSummary: "采用细节参考图中的面料颜色、纹理、厚度与垂坠质感。",
      templatePrompt:
        "保留客户房间的结构、窗户位置、透视角度和主要光线方向，为窗户安装整体款式参考图中的窗帘造型，并准确还原材质细节图中的颜色、纹理、厚度和垂感，生成真实自然的室内摄影效果。",
    };
  }

  const imageUrls = await Promise.all([
    toBailianImageReference(parsedInput.roomImageUrl),
    toBailianImageReference(parsedInput.styleImageUrl),
    toBailianImageReference(parsedInput.detailImageUrl),
  ]);
  const content: OpenAI.ChatCompletionContentPart[] = [
    ...imageUrls.map((url) => ({
      type: "image_url" as const,
      image_url: { url },
    })),
    { type: "text", text: analysisInstruction },
  ];
  const request: BailianVisionRequest = {
    model: config.textModel,
    messages: [{ role: "user", content }],
    response_format: { type: "json_object" },
    enable_thinking: false,
  };
  const response = await createBailianTextClient(
    config.apiKey,
  ).chat.completions.create(request);

  return parseAnalysisText(extractChatCompletionText(response));
}
