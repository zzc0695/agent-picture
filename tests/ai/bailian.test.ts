// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  extractBailianImageUrl,
  extractChatCompletionText,
  getBailianConfig,
} from "@/lib/ai/bailian";

describe("Bailian provider", () => {
  it("uses Qwen defaults", () => {
    expect(getBailianConfig({ DASHSCOPE_API_KEY: "key" })).toMatchObject({
      apiKey: "key",
      textModel: "qwen3.7-plus",
      imageModel: "wan2.7-image-pro",
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
});
