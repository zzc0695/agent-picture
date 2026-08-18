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

export function getBailianConfig(env: NodeJS.ProcessEnv = process.env) {
  return {
    apiKey: env.DASHSCOPE_API_KEY,
    textModel: env.DASHSCOPE_TEXT_MODEL ?? "qwen3.7-flash",
    imageModel: env.DASHSCOPE_IMAGE_MODEL ?? "qwen-image-3.0",
  };
}

export function createBailianTextClient(apiKey: string) {
  return new OpenAI({
    apiKey,
    baseURL: textBaseUrl,
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

export async function generateBailianImage(
  apiKey: string,
  model: string,
  content: BailianContentPart[],
  options: BailianImageOptions = {},
) {
  const response = await fetch(imageEndpoint, {
    method: "POST",
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
        prompt_extend: true,
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
