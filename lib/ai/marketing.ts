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
    "当前处于 AI 效果图方案沟通阶段，尚未证明购买、施工、安装、验收或客户满意。不得称其为实景、已安装、已验收、尺寸精准、客户认可，也不得承诺售后服务。客户备注中的‘验收’等词可能指产品测试，不构成完工证据。客户话术应邀请确认款式配色，并说明尺寸和实物效果需要现场核对。",
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
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "marketing_copy", strict: true,
        schema: {
          type: "object", additionalProperties: false,
          required: ["shortVideoScript", "socialCopy", "customerScript"],
          properties: {
            shortVideoScript: { type: "string", description: "分镜和旁白组成的完整短视频脚本文本" },
            socialCopy: { type: "string", description: "可直接发布的社交文案文本" },
            customerScript: { type: "string", description: "面向客户的方案说明文本" },
          },
        },
      },
    },
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
