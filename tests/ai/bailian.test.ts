// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extractBailianImageUrl,
  extractChatCompletionText,
  generateBailianImage,
  getBailianConfig,
} from "@/lib/ai/bailian";

describe("Bailian provider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the selected Qwen defaults", () => {
    expect(getBailianConfig({ DASHSCOPE_API_KEY: "key" })).toMatchObject({
      apiKey: "key",
      textModel: "qwen3.7-flash",
      imageModel: "qwen-image-3.0",
    });
  });

  it("uses explicit model overrides", () => {
    expect(
      getBailianConfig({
        DASHSCOPE_API_KEY: "key",
        DASHSCOPE_TEXT_MODEL: "qwen-plus",
        DASHSCOPE_IMAGE_MODEL: "qwen-image-2.0-pro",
      }),
    ).toMatchObject({
      textModel: "qwen-plus",
      imageModel: "qwen-image-2.0-pro",
    });
  });

  it("extracts text from a chat completion", () => {
    expect(
      extractChatCompletionText({
        choices: [{ message: { content: "生成的文案" } }],
      }),
    ).toBe("生成的文案");
  });

  it("extracts the generated image URL", () => {
    expect(
      extractBailianImageUrl({
        output: {
          choices: [
            {
              message: {
                content: [{ text: "说明" }, { image: "https://example.com/a.png" }],
              },
            },
          ],
        },
      }),
    ).toBe("https://example.com/a.png");
  });

  it("rejects a response without an image URL", () => {
    expect(() =>
      extractBailianImageUrl({ output: { choices: [] } }),
    ).toThrow("图片生成接口没有返回图片地址");
  });

  it("sends Qwen Image editing parameters without exposing the key", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          output: {
            choices: [
              {
                message: {
                  content: [{ image: "https://example.com/result.png" }],
                },
              },
            ],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await generateBailianImage(
      "test-key",
      "qwen-image-3.0",
      [
        { image: "https://example.com/room.png" },
        { text: "替换窗帘" },
      ],
      { negativePrompt: "避免改变房间结构" },
    );

    const [, request] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(request.body));
    expect(body).toMatchObject({
      model: "qwen-image-3.0",
      parameters: {
        size: "1024*1024",
        n: 1,
        negative_prompt: "避免改变房间结构",
        prompt_extend: true,
        watermark: false,
      },
    });
    expect(String(request.headers.Authorization)).toBe("Bearer test-key");
    expect(JSON.stringify(body)).not.toContain("test-key");
  });
});
