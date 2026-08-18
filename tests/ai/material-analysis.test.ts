// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const completionCreate = vi.hoisted(() => vi.fn());
const toBailianImageReference = vi.hoisted(() => vi.fn());

vi.mock("@/lib/ai/bailian", () => ({
  getBailianConfig: () => ({
    apiKey: process.env.DASHSCOPE_API_KEY,
    textModel: "qwen3.7-flash",
    imageModel: "qwen-image-3.0",
  }),
  createBailianTextClient: () => ({
    chat: { completions: { create: completionCreate } },
  }),
  extractChatCompletionText: (response: {
    choices: Array<{ message: { content: string } }>;
  }) => response.choices[0].message.content,
}));

vi.mock("@/lib/files/storage", () => ({
  toBailianImageReference,
}));

describe("material image analysis", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.DASHSCOPE_API_KEY;
    toBailianImageReference.mockImplementation(async (url: string) =>
      `data:image/jpeg;base64,${url}`,
    );
  });

  it("sends room, style, and detail images in a fixed order", async () => {
    process.env.DASHSCOPE_API_KEY = "test-key";
    completionCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              roomSummary: "明亮的现代客厅，大面积落地窗",
              styleSummary: "米白双层落地帘，简约褶皱",
              materialSummary: "细密哑光遮光布搭配白纱",
              templatePrompt: "为落地窗安装米白双层窗帘，保留房间结构。",
            }),
          },
        },
      ],
    });
    const { analyzeMaterials } = await import("@/lib/ai/material-analysis");

    await expect(
      analyzeMaterials({
        roomImageUrl: "/uploads/room.jpg",
        styleImageUrl: "/uploads/style.jpg",
        detailImageUrl: "/uploads/detail.jpg",
      }),
    ).resolves.toMatchObject({ roomSummary: "明亮的现代客厅，大面积落地窗" });

    expect(completionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "qwen3.7-flash",
        enable_thinking: false,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: "data:image/jpeg;base64,/uploads/room.jpg",
                },
              },
              {
                type: "image_url",
                image_url: {
                  url: "data:image/jpeg;base64,/uploads/style.jpg",
                },
              },
              {
                type: "image_url",
                image_url: {
                  url: "data:image/jpeg;base64,/uploads/detail.jpg",
                },
              },
              expect.objectContaining({
                type: "text",
                text: expect.stringContaining("templatePrompt"),
              }),
            ],
          },
        ],
      }),
    );
  });

  it("rejects incomplete structured output", async () => {
    process.env.DASHSCOPE_API_KEY = "test-key";
    completionCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ roomSummary: "客厅" }) } }],
    });
    const { analyzeMaterials } = await import("@/lib/ai/material-analysis");

    await expect(
      analyzeMaterials({
        roomImageUrl: "/uploads/room.jpg",
        styleImageUrl: "/uploads/style.jpg",
        detailImageUrl: "/uploads/detail.jpg",
      }),
    ).rejects.toThrow();
  });

  it("returns an editable fallback when no API key is configured", async () => {
    const { analyzeMaterials } = await import("@/lib/ai/material-analysis");

    await expect(
      analyzeMaterials({
        roomImageUrl: "/uploads/room.jpg",
        styleImageUrl: "/uploads/style.jpg",
        detailImageUrl: "/uploads/detail.jpg",
      }),
    ).resolves.toMatchObject({
      templatePrompt: expect.stringContaining("窗帘"),
    });
    expect(completionCreate).not.toHaveBeenCalled();
  });
});
