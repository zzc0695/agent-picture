// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const generate = vi.fn();
const saveGeneratedImage = vi.fn();

vi.mock("openai", () => ({
  default: vi.fn(function OpenAI() {
    return {
      images: {
        generate,
      },
    };
  }),
}));

vi.mock("@/lib/files/storage", () => ({
  saveGeneratedImage,
}));

describe("generateEffectImage", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_IMAGE_MODEL;
  });

  it("uses the image generation API and persists returned image bytes", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_IMAGE_MODEL = "gpt-image-1";
    generate.mockResolvedValue({
      data: [{ b64_json: Buffer.from("generated-image").toString("base64") }],
    });
    saveGeneratedImage.mockResolvedValue("/uploads/generated-effect.png");

    const { generateEffectImage } = await import("@/lib/ai/image");

    const result = await generateEffectImage({
      roomImageUrl: "/uploads/room.jpg",
      sampleImageUrl: "/uploads/sample.jpg",
      optimizedPrompt: "米白窗帘，真实摄影质感",
      negativePrompt: "避免窗户变形",
      fidelity: "balanced",
    });

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-image-1",
        prompt: expect.stringContaining("米白窗帘"),
        n: 1,
        size: "1024x1024",
      }),
    );
    expect(saveGeneratedImage).toHaveBeenCalledWith(
      Buffer.from("generated-image"),
      "png",
    );
    expect(result).toEqual({
      imageUrl: "/uploads/generated-effect.png",
      inputSummary: "balanced: 米白窗帘，真实摄影质感",
    });
  });

  it("throws when the image API does not return image data", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    generate.mockResolvedValue({ data: [{}] });
    const { generateEffectImage } = await import("@/lib/ai/image");

    await expect(
      generateEffectImage({
        roomImageUrl: "/uploads/room.jpg",
        sampleImageUrl: "/uploads/sample.jpg",
        optimizedPrompt: "米白窗帘",
        negativePrompt: "",
        fidelity: "strict",
      }),
    ).rejects.toThrow("图片生成接口没有返回图片数据");
  });
});
