import { Agent } from "undici";

const imageDispatcher = new Agent({ connect: { timeout: 30_000, family: 4 } });
const imageTransport = { dispatcher: imageDispatcher };

import OpenAI from "openai";

const textBaseUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1";
const imageEndpoint =
  "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";

export type BailianImageContentPart = { image: string };
export type BailianTextContentPart = { text: string };
export type BailianContentPart =
  | BailianImageContentPart
  | BailianTextContentPart;

export type BailianImageOptions = {
  negativePrompt?: string;
};

type BailianImageResponse = {
  output?: {
    choices?: Array<{
      message?: {
        content?: Array<{
          image?: string;
          text?: string;
        }>;
      };
    }>;
  };
};

export function getBailianConfig(
  env: Record<string, string | undefined> = process.env,
) {
  return {
    apiKey: env.DASHSCOPE_API_KEY,
    textModel: env.DASHSCOPE_TEXT_MODEL ?? "qwen3.7-flash",
    imageModel: env.DASHSCOPE_IMAGE_MODEL ?? "qwen-image-3.0",
  };
}

export function createBailianTextClient(apiKey: string) {
  return new OpenAI({
    apiKey,
    baseURL: process.env.DASHSCOPE_BASE_URL ? `${process.env.DASHSCOPE_BASE_URL}/compatible-mode/v1` : textBaseUrl,
    timeout: 45_000,
    maxRetries: 0,
  });
}

export function extractChatCompletionText(response: {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}) {
  const text = response.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new Error("文本生成接口没有返回内容");
  }

  return text;
}

export function extractBailianImageUrl(response: BailianImageResponse) {
  const imageUrl = response.output?.choices?.[0]?.message?.content?.find(
    (part) => part.image,
  )?.image;

  if (!imageUrl) {
    throw new Error("图片生成接口没有返回图片地址");
  }

  return imageUrl;
}

function providerErrorMessage(body: unknown, status: number) {
  if (!body || typeof body !== "object") {
    return "图片生成失败：" + status;
  }

  const error = body as { code?: unknown; message?: unknown };
  const code = typeof error.code === "string" ? error.code : String(status);
  const message = typeof error.message === "string" ? error.message : "";

  return "图片生成失败：" + code + (message ? " " + message : "");
}

function imageApiBase() {
  return process.env.DASHSCOPE_BASE_URL ?? "https://dashscope.aliyuncs.com";
}

export async function submitBailianImage(apiKey: string, model: string, content: BailianContentPart[], options: BailianImageOptions = {}) {
  const response = await fetch(`${imageApiBase()}/api/v1/services/aigc/image-generation/generation`, {
    ...imageTransport,
    method: "POST", signal: AbortSignal.timeout(45_000),
    headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json", "X-DashScope-Async": "enable" },
    body: JSON.stringify({ model, input: { messages: [{ role: "user", content }] }, parameters: {
      size: "1024*1024", n: 1, negative_prompt: options.negativePrompt || undefined, prompt_extend: false, watermark: false,
    } }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(providerErrorMessage(body, response.status));
  if (typeof body.output?.task_id !== "string" || !body.output.task_id) throw new Error("图片接口没有返回任务编号");
  return body.output.task_id as string;
}

export async function getBailianImageTask(apiKey: string, taskId: string) {
  const response = await fetch(`${imageApiBase()}/api/v1/tasks/${encodeURIComponent(taskId)}`, {
    ...imageTransport,
    headers: { Authorization: "Bearer " + apiKey }, signal: AbortSignal.timeout(45_000), cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok) throw new Error(providerErrorMessage(body, response.status));
  const status: string = body.output?.task_status ?? "UNKNOWN";
  return { status, imageUrl: status === "SUCCEEDED" ? extractBailianImageUrl(body) : undefined };
}

export async function generateBailianImage(
  apiKey: string,
  model: string,
  content: BailianContentPart[],
  options: BailianImageOptions = {},
) {
  const response = await fetch(imageEndpoint, {
    method: "POST",
    // End gracefully before the platform's 300-second execution limit.
    signal: AbortSignal.timeout(240_000),
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: {
        messages: [{ role: "user", content }],
      },
      parameters: {
        size: "1024*1024",
        n: 1,
        negative_prompt: options.negativePrompt || undefined,
        // The workbench already supplies detailed constraints; avoid a second rewrite.
        prompt_extend: false,
        watermark: false,
      },
    }),
  });
  const body: unknown = await response.json();

  if (!response.ok) {
    throw new Error(providerErrorMessage(body, response.status));
  }

  return extractBailianImageUrl(body as BailianImageResponse);
}
