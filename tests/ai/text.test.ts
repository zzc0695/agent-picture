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
      choices: [{ message: { content: JSON.stringify({ optimizedPrompt: "优化后的提示词", negativePrompt: "避免窗户变形" }) } }],
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
      choices: [{ message: { content: JSON.stringify({ shortVideoScript: "先展示原图再展示效果", socialCopy: "新款窗帘搭配分享", customerScript: "请确认您喜欢的配色" }) } }],
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
      shortVideoScript: "先展示原图再展示效果",
      socialCopy: "新款窗帘搭配分享",
      customerScript: "请确认您喜欢的配色",
    });
    expect(completionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "qwen3.7-flash",
        enable_thinking: false,
        response_format: expect.objectContaining({ type: "json_schema", json_schema: expect.objectContaining({ strict: true, schema: expect.objectContaining({ additionalProperties: false, required: ["shortVideoScript", "socialCopy", "customerScript"], properties: expect.objectContaining({ shortVideoScript: expect.objectContaining({ type: "string" }) }) }) }) }),
      }),
    );
  });

  it("rejects missing or unstructured copy instead of repeating the whole output", async () => {
    process.env.DASHSCOPE_API_KEY = "test-key";
    completionCreate.mockResolvedValue({ choices: [{ message: { content: '{"socialCopy":"只有一段"}' } }] });
    const { generateMarketingCopy } = await import("@/lib/ai/marketing");
    await expect(generateMarketingCopy({ materialSummary: "布料", roomSummary: "客厅", effectImageUrl: "/uploads/result.png", customerNotes: "" })).rejects.toThrow();
  });

  it("reports unconfigured text services instead of presenting canned text as AI output", async () => {
    const { generateMarketingCopy } = await import("@/lib/ai/marketing");
    const { optimizePrompt } = await import("@/lib/ai/prompt");
    await expect(generateMarketingCopy({ materialSummary: "布料", roomSummary: "客厅", effectImageUrl: "/uploads/result.png", customerNotes: "" })).rejects.toThrow("尚未配置");
    await expect(optimizePrompt({ userPrompt: "窗帘", fidelity: "balanced", materialSummary: "布料" })).rejects.toThrow("尚未配置");
  });
});
