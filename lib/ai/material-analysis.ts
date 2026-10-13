import type OpenAI from "openai";
import { AiUnavailableError } from "@/lib/ai/errors";
import {
  createBailianTextClient,
  extractChatCompletionText,
  getBailianConfig,
} from "@/lib/ai/bailian";
import { toAsyncImageReference } from "@/lib/files/storage";
import { sampleObservationGuide } from "./sample-observation";
import type { SupplementalImage } from "@/lib/photo-types";
import {
  materialAnalysisRequestSchema,
  materialAnalysisResultSchema,
} from "@/lib/validators";

type MaterialAnalysisInput = {
  roomImageUrl: string;
  styleImageUrl: string;
  detailImageUrl: string;
  supplementalImages?: SupplementalImage[];
};

type BailianVisionRequest = OpenAI.ChatCompletionCreateParamsNonStreaming & {
  enable_thinking: boolean;
};

const analysisInstruction = [
  "你是软装窗帘方案分析师。请严格按照图片顺序分析：图1是客户房间，图2是窗帘整体款式，图3是面料材质细节。",
  "识别房间类型、布局、窗户结构、光线和主色调；识别窗帘层次、褶皱、轨道和配色；识别面料颜色、纹理、厚度、遮光感和白纱特征。",
  sampleObservationGuide,
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
    throw new AiUnavailableError();
  }

  const imageUrls = await Promise.all([
    toAsyncImageReference(parsedInput.roomImageUrl),
    toAsyncImageReference(parsedInput.styleImageUrl),
    toAsyncImageReference(parsedInput.detailImageUrl),
    ...parsedInput.supplementalImages.map(photo => toAsyncImageReference(photo.url)),
  ]);
  const content: OpenAI.ChatCompletionContentPart[] = [
    ...imageUrls.map((url) => ({
      type: "image_url" as const,
      image_url: { url },
    })),
    { type: "text", text: [analysisInstruction,...parsedInput.supplementalImages.map((photo,index)=>`图${index+4}是${photo.role}补图，用于确认主图缺失或模糊的细节，不复制补图背景。`)].join("\n") },
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
