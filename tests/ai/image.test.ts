// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const generateBailianImage = vi.hoisted(() => vi.fn());
const saveGeneratedImage = vi.hoisted(() => vi.fn());
const toBailianImageReference = vi.hoisted(() => vi.fn());

vi.mock("@/lib/ai/bailian", () => ({
  getBailianConfig: () => ({
    apiKey: process.env.DASHSCOPE_API_KEY,
    imageModel: "qwen-image-3.0",
    textModel: "qwen3.7-flash",
  }),
  generateBailianImage,
}));

vi.mock("@/lib/files/storage", () => ({
  saveGeneratedImage,
  toBailianImageReference,
}));

describe("generateEffectImage", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.DASHSCOPE_API_KEY;
    toBailianImageReference.mockImplementation(async (url: string) => {
      return "data:image/jpeg;base64," + url;
    });
  });

  it("uses Bailian image generation and persists downloaded image bytes", async () => {
    process.env.DASHSCOPE_API_KEY = "test-key";
    generateBailianImage.mockResolvedValue("https://temporary.example/image.png");
    saveGeneratedImage.mockResolvedValue("/uploads/generated-effect.png");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(Buffer.from("generated-image"), { status: 200 }),
      ),
    );

    const { generateEffectImage } = await import("@/lib/ai/image");

    const result = await generateEffectImage({
      roomImageUrl: "/uploads/room.jpg",
      styleImageUrl: "/uploads/style.jpg",
      detailImageUrl: "/uploads/detail.jpg",
      optimizedPrompt: "米白窗帘，真实摄影质感",
      negativePrompt: "避免窗户变形",
      fidelity: "balanced",
      imageAnalysis: "明亮客厅；米白双层帘；细密遮光布",
    });

    expect(generateBailianImage).toHaveBeenCalledWith(
      "test-key",
      "qwen-image-3.0",
      [
        { image: "data:image/jpeg;base64,/uploads/room.jpg" },
        { image: "data:image/jpeg;base64,/uploads/style.jpg" },
        { image: "data:image/jpeg;base64,/uploads/detail.jpg" },
        expect.objectContaining({
          text: expect.stringContaining(
            "图1是原房间，图2是窗帘整体款式，图3是材质细节",
          ),
        }),
      ],
      { negativePrompt: "避免窗户变形" },
    );
    expect(fetch).toHaveBeenCalledWith("https://temporary.example/image.png");
    expect(saveGeneratedImage).toHaveBeenCalledWith(
      Buffer.from("generated-image"),
      "png",
    );
    expect(result).toEqual({
      imageUrl: "/uploads/generated-effect.png",
      inputSummary: "balanced: 米白窗帘，真实摄影质感",
    });
  });

  it("throws when the generated image cannot be downloaded", async () => {
    process.env.DASHSCOPE_API_KEY = "test-key";
    generateBailianImage.mockResolvedValue("https://temporary.example/image.png");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 502 })));
    const { generateEffectImage } = await import("@/lib/ai/image");

    await expect(
      generateEffectImage({
        roomImageUrl: "/uploads/room.jpg",
        styleImageUrl: "/uploads/style.jpg",
        detailImageUrl: "/uploads/detail.jpg",
        optimizedPrompt: "米白窗帘",
        negativePrompt: "",
        fidelity: "strict",
        imageAnalysis: "",
      }),
    ).rejects.toThrow("无法下载图片生成结果");
  });

  it("uses the current effect plus both material references for a similar result", async () => {
    process.env.DASHSCOPE_API_KEY = "test-key";
    generateBailianImage.mockResolvedValue("https://temporary.example/image.png");
    saveGeneratedImage.mockResolvedValue("/uploads/similar-effect.png");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(Buffer.from("generated-image"), { status: 200 }),
      ),
    );
    const { generateEffectImage } = await import("@/lib/ai/image");

    await generateEffectImage({
      roomImageUrl: "/uploads/room.jpg",
      styleImageUrl: "/uploads/style.jpg",
      detailImageUrl: "/uploads/detail.jpg",
      optimizedPrompt: "米白窗帘",
      negativePrompt: "",
      fidelity: "balanced",
      imageAnalysis: "",
      referenceImageUrl: "/uploads/current-effect.png",
    });

    expect(generateBailianImage).toHaveBeenCalledWith(
      "test-key",
      "qwen-image-3.0",
      [
        { image: "data:image/jpeg;base64,/uploads/current-effect.png" },
        { image: "data:image/jpeg;base64,/uploads/style.jpg" },
        { image: "data:image/jpeg;base64,/uploads/detail.jpg" },
        expect.objectContaining({
          text: expect.stringContaining("图1是当前效果图"),
        }),
      ],
      { negativePrompt: "" },
    );
  });
});
