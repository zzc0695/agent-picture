import type OpenAI from "openai";
import { z } from "zod";
import { AiUnavailableError, parseJsonOutput } from "@/lib/ai/errors";
import {
  createBailianTextClient,
  extractChatCompletionText,
  getBailianConfig,
} from "@/lib/ai/bailian";

type BailianChatRequest = OpenAI.ChatCompletionCreateParamsNonStreaming & {
  enable_thinking: boolean;
};

export async function generateMarketingCopy(input: {
  materialSummary: string;
  roomSummary: string;
  effectImageUrl: string;
  customerNotes: string;
}) {
  const prompt = [
    "你是窗帘和软装销售文案助手。",
    "基于素材信息、房间场景和客户备注，生成短视频脚本、朋友圈/社群文案、客户沟通话术。",
    "只返回 JSON 对象，包含 shortVideoScript、socialCopy、customerScript 三个非空字符串，分别写短视频分镜脚本、可直接发布的社交文案和面向客户的沟通话术，不要把整份输出重复到各字段。",
    "不要虚构面料成分、遮光率、价格或安装承诺；未提供的信息不作断言。",
    `素材信息：${input.materialSummary}`,
    `房间场景：${input.roomSummary}`,
    `效果图：${input.effectImageUrl}`,
    `客户备注：${input.customerNotes}`,
  ].join("\n");

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
    shortVideoScript: z.string().trim().min(1),
    socialCopy: z.string().trim().min(1),
    customerScript: z.string().trim().min(1),
  }).parse(parseJsonOutput(extractChatCompletionText(response)));
}
