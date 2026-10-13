// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const generateBailianImage = vi.hoisted(() => vi.fn());
const saveGeneratedImage = vi.hoisted(() => vi.fn());
const toBailianImageReference = vi.hoisted(() => vi.fn());
const describeRoomLayout = vi.hoisted(() => vi.fn());
vi.mock("@/lib/ai/room-layout", () => ({ describeRoomLayout }));

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
  roomImageOutputSize: vi.fn(async () => "1360*768"),
}));

describe("generateEffectImage", () => {
  it("does not return the original room as a generated image when the provider is unconfigured", async () => {
    delete process.env.DASHSCOPE_API_KEY;
    const { generateEffectImage } = await import("@/lib/ai/image");
    await expect(generateEffectImage({ roomImageUrl: "/uploads/room.jpg", styleImageUrl: "/uploads/style.jpg", detailImageUrl: "/uploads/detail.jpg", optimizedPrompt: "窗帘", negativePrompt: "", fidelity: "balanced", imageAnalysis: "" })).rejects.toThrow("尚未配置");
    expect(generateBailianImage).not.toHaveBeenCalled();
  });
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    describeRoomLayout.mockResolvedValue("保留原位：沙发在画面左侧，茶几位于前景中央，窗帘在沙发后面");
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
        new Response(Buffer.from("generated-image"), { status: 200, headers: { "Content-Type": "image/png" } }),
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
      { negativePrompt: expect.stringContaining("避免窗户变形"), size: "1360*768" },
    );
    expect(fetch).toHaveBeenCalledWith("https://temporary.example/image.png", { signal: expect.any(AbortSignal) });
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

  it("anchors repeated generations to the original room instead of a drifting generated result", async () => {
    process.env.DASHSCOPE_API_KEY = "test-key";
    generateBailianImage.mockResolvedValue("https://temporary.example/image.png");
    saveGeneratedImage.mockResolvedValue("/uploads/similar-effect.png");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(Buffer.from("generated-image"), { status: 200, headers: { "Content-Type": "image/png" } }),
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
        { image: "data:image/jpeg;base64,/uploads/room.jpg" },
        { image: "data:image/jpeg;base64,/uploads/style.jpg" },
        { image: "data:image/jpeg;base64,/uploads/detail.jpg" },
        expect.objectContaining({
          text: expect.stringContaining("图1是原房间"),
        }),
      ],
      { negativePrompt: expect.stringContaining("家具移动"), size: "1360*768" },
    );
  });
  it("adds position protection even when the user supplies a short prompt", async () => {
    process.env.DASHSCOPE_API_KEY='test-key';
    const { prepareImageGeneration }=await import('@/lib/ai/image');
    const result=await prepareImageGeneration({roomImageUrl:'/room.png',styleImageUrl:'/style.png',detailImageUrl:'/detail.png',optimizedPrompt:'换成蓝色',negativePrompt:'',fidelity:'balanced',imageAnalysis:''});
    const text=result.content.find(part=>'text' in part)?.text;
    expect(text).toContain('不移动床、沙发、桌椅');
    expect(text).toContain('只调整原窗户对应的窗帘区域');
    expect(text).toContain('沙发在画面左侧');
    expect(describeRoomLayout).toHaveBeenCalledWith('data:image/jpeg;base64,/room.png');
  });

  it("reuses automatic room observations during a submission retry", async () => {
    process.env.DASHSCOPE_API_KEY = 'test-key';
    const { prepareImageGeneration } = await import('@/lib/ai/image');
    const result = await prepareImageGeneration({ roomImageUrl:'/room.png',styleImageUrl:'/style.png',detailImageUrl:'/detail.png',optimizedPrompt:'蓝色窗帘',negativePrompt:'',fidelity:'balanced',imageAnalysis:'',spatialGuide:'保留原位：床位于窗户左侧' });
    expect(describeRoomLayout).not.toHaveBeenCalled();
    expect(result.content.find(part => 'text' in part)?.text).toContain('床位于窗户左侧');
  });

  it("still generates with the original-room constraints when observation is unavailable", async () => {
    process.env.DASHSCOPE_API_KEY = 'test-key';
    describeRoomLayout.mockRejectedValue(new Error('timeout'));
    const { prepareImageGeneration } = await import('@/lib/ai/image');
    const result = await prepareImageGeneration({ roomImageUrl:'/room.png',styleImageUrl:'/style.png',detailImageUrl:'/detail.png',optimizedPrompt:'蓝色窗帘',negativePrompt:'',fidelity:'balanced',imageAnalysis:'' });
    expect(result.content.find(part => 'text' in part)?.text).toContain('不移动床、沙发、桌椅');
  });

});
