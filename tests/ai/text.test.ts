// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const completionCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/ai/bailian", () => ({
  getBailianConfig: () => ({
    apiKey: process.env.DASHSCOPE_API_KEY,
    textModel: "qwen3.7-flash",
    imageModel: "qwen-image-3.0",
  }),
  createBailianTextClient: () => ({
    chat: {
      completions: {
        create: completionCreate,
      },
    },
  }),
  extractChatCompletionText: (response: {
    choices: Array<{ message: { content: string } }>;
  }) => response.choices[0].message.content,
}));

describe("Bailian text generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.DASHSCOPE_API_KEY;
  });

  it("uses Qwen chat completions for prompt optimization", async () => {
    process.env.DASHSCOPE_API_KEY = "test-key";
    completionCreate.mockResolvedValue({
      choices: [{ message: { content: "优化后的提示词" } }],
    });
    const { optimizePrompt } = await import("@/lib/ai/prompt");

    await expect(
      optimizePrompt({
        userPrompt: "米白窗帘",
        fidelity: "balanced",
        materialSummary: "绒布",
      }),
    ).resolves.toMatchObject({ optimizedPrompt: "优化后的提示词" });
    expect(completionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "qwen3.7-flash",
        enable_thinking: false,
        messages: expect.arrayContaining([
          expect.objectContaining({ content: expect.stringContaining("米白窗帘") }),
        ]),
      }),
    );
  });

  it("uses Qwen chat completions for marketing copy", async () => {
    process.env.DASHSCOPE_API_KEY = "test-key";
    completionCreate.mockResolvedValue({
      choices: [{ message: { content: "可直接使用的营销文案" } }],
    });
    const { generateMarketingCopy } = await import("@/lib/ai/marketing");

    await expect(
      generateMarketingCopy({
        materialSummary: "米白绒布",
        roomSummary: "明亮客厅",
        effectImageUrl: "https://example.com/result.png",
        customerNotes: "偏温馨",
      }),
    ).resolves.toEqual({
      shortVideoScript: "可直接使用的营销文案",
      socialCopy: "可直接使用的营销文案",
      customerScript: "可直接使用的营销文案",
    });
    expect(completionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "qwen3.7-flash",
        enable_thinking: false,
      }),
    );
  });
});
