import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as generateImagePost } from "@/app/api/ai/generate-image/route";
import { POST as analyzeMaterialsPost } from "@/app/api/ai/analyze-materials/route";
import { POST as optimizePromptPost } from "@/app/api/ai/optimize-prompt/route";
import { analyzeMaterials } from "@/lib/ai/material-analysis";
import { startImageJob } from "@/lib/ai/image-jobs";
import { optimizePrompt } from "@/lib/ai/prompt";
import { createGroundedPrompt } from "@/lib/ai/grounded-prompt";
import { db } from "@/lib/db";
import { MaterialImageInputError } from "@/lib/files/storage";
import { AiUnavailableError } from "@/lib/ai/errors";

vi.mock("@/lib/auth/require-session", () => ({
  requireMerchantSession: vi.fn(async () => ({
    merchantId: "merchant_1",
    email: "demo@example.com",
  })),
  unauthorizedResponse: () =>
    Response.json({ error: "请先登录" }, { status: 401 }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    merchant: { findUnique: vi.fn(async () => ({ disabled: false, dailyImages: null, dailyText: null, concurrentImages: null })) },
    generationRecord: {
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(async () => 0),
    },
    $transaction: vi.fn(async (action) => action(db)),
  },
}));

vi.mock("@/lib/ai/image-jobs", () => ({
  startImageJob: vi.fn(),
}));

vi.mock("@/lib/ai/material-analysis", () => ({
  analyzeMaterials: vi.fn(),
}));

vi.mock("@/lib/ai/prompt", () => ({
  optimizePrompt: vi.fn(),
}));
vi.mock("@/lib/ai/grounded-prompt", () => ({ createGroundedPrompt: vi.fn() }));
vi.mock("@/lib/files/storage", async (original) => ({ ...await original<typeof import("@/lib/files/storage")>(), toAsyncImageReference: vi.fn(async (url: string) => `validated:${url}`) }));

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("AI API routes", () => {
  it("requires actual images before optimizing a prompt", async () => {
    const response = await optimizePromptPost(jsonRequest("http://localhost/api/ai/optimize-prompt", {userPrompt:"法式窗帘",fidelity:"balanced"}));
    expect(response.status).toBe(400);
    expect(createGroundedPrompt).not.toHaveBeenCalled();
  });
  it("passes the current three images to vision and returns their observations with the prompt", async () => {
    vi.mocked(createGroundedPrompt).mockResolvedValue({roomSummary:"左侧窗户",styleSummary:"蓝色打孔帘",materialSummary:"素面细织纹",optimizedPrompt:"根据蓝色打孔帘与实际细织纹设计",negativePrompt:"不移家具",excludedSampleItems:[]});
    const response = await optimizePromptPost(jsonRequest("http://localhost/api/ai/optimize-prompt", {userPrompt:"法式窗帘",fidelity:"balanced",roomImageUrl:"/room.png",styleImageUrl:"/style.png",detailImageUrl:"/fabric.png"}));
    expect(response.status).toBe(200);
    expect(createGroundedPrompt).toHaveBeenCalledWith(["validated:/room.png","validated:/style.png","validated:/fabric.png"],"法式窗帘","balanced",[]);
    expect((await response.json()).styleSummary).toBe("蓝色打孔帘");
  });
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.generationRecord.create).mockResolvedValue({ id: "record" } as never);
  });

  it.each([
    new DOMException("timed out", "TimeoutError"),
    new DOMException("aborted", "AbortError"),
    Object.assign(new Error("timed out"), { name: "TimeoutError" }),
  ])("returns a readable timeout instead of a blank platform error (%s)", async (error) => {
    vi.mocked(startImageJob).mockRejectedValue(error);
    const response = await generateImagePost(jsonRequest("http://localhost/api/ai/generate-image", {
      roomImageUrl: "/demo/living-room.png", styleImageUrl: "/demo/curtain-fabric.png", detailImageUrl: "/demo/curtain-fabric.png", optimizedPrompt: "米白窗帘", fidelity: "balanced",
    }));
    expect(response.status).toBe(504);
    expect((await response.json()).error).toContain("等待超时");
    expect(db.generationRecord.create).not.toHaveBeenCalled();
  });

  it.each([new AiUnavailableError(), new Error("provider failed")])("returns JSON when image generation fails without recording success", async (error) => {
    vi.mocked(startImageJob).mockRejectedValue(error);
    const response = await generateImagePost(jsonRequest("http://localhost/api/ai/generate-image", {
      roomImageUrl: "/uploads/room.jpg", styleImageUrl: "/uploads/style.jpg", detailImageUrl: "/uploads/detail.jpg", optimizedPrompt: "蓝色窗帘", fidelity: "balanced",
    }));
    expect(response.status).toBe(error instanceof AiUnavailableError ? 503 : 502);
    expect((await response.json()).error).toMatch(/AI/);
    expect(db.generationRecord.create).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid prompt optimization fidelity", async () => {
    const response = await optimizePromptPost(
      jsonRequest("http://localhost/api/ai/optimize-prompt", {
        userPrompt: "客厅窗帘",
        materialSummary: "米白绒布",
        fidelity: "exact",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "样本还原度无效",
    });
    expect(optimizePrompt).not.toHaveBeenCalled();
    expect(db.generationRecord.create).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid image generation fidelity", async () => {
    const response = await generateImagePost(
      jsonRequest("http://localhost/api/ai/generate-image", {
        roomImageUrl: "/uploads/room.jpg",
        styleImageUrl: "/uploads/style.jpg",
        detailImageUrl: "/uploads/detail.jpg",
        optimizedPrompt: "客厅窗帘",
        negativePrompt: "",
        fidelity: "exact",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "效果图生成信息不完整或样本还原度无效",
    });
    expect(startImageJob).not.toHaveBeenCalled();
    expect(db.generationRecord.create).not.toHaveBeenCalled();
  });

  it("validates and records three-image material analysis", async () => {
    vi.mocked(analyzeMaterials).mockResolvedValue({
      roomSummary: "明亮客厅",
      styleSummary: "米白双层帘",
      materialSummary: "细密遮光布",
      templatePrompt: "为落地窗安装米白双层帘。",
    });

    const response = await analyzeMaterialsPost(
      jsonRequest("http://localhost/api/ai/analyze-materials", {
        roomImageUrl: "/uploads/room.jpg",
        styleImageUrl: "/uploads/style.jpg",
        detailImageUrl: "/uploads/detail.jpg",
      }),
    );

    expect(response.status).toBe(200);
    expect(analyzeMaterials).toHaveBeenCalledWith({
      roomImageUrl: "/uploads/room.jpg",
      styleImageUrl: "/uploads/style.jpg",
      detailImageUrl: "/uploads/detail.jpg",
      supplementalImages: [],
    });
    expect(db.generationRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "material_analysis" }),
    });
  });

  it("rejects incomplete material analysis input", async () => {
    const response = await analyzeMaterialsPost(
      jsonRequest("http://localhost/api/ai/analyze-materials", {
        roomImageUrl: "/uploads/room.jpg",
        styleImageUrl: "",
        detailImageUrl: "/uploads/detail.jpg",
      }),
    );

    expect(response.status).toBe(400);
    expect(analyzeMaterials).not.toHaveBeenCalled();
  });

  it("returns a safe input error when a material image cannot be accepted", async () => {
    vi.mocked(analyzeMaterials).mockRejectedValue(
      new MaterialImageInputError("单张图片不能超过 7MB"),
    );
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await analyzeMaterialsPost(
      jsonRequest("http://localhost/api/ai/analyze-materials", {
        roomImageUrl: "/uploads/room.jpg",
        styleImageUrl: "/uploads/style.jpg",
        detailImageUrl: "/uploads/detail.jpg",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "单张图片不能超过 7MB",
    });
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('"event":"material_analysis_failed"'),
    );
    expect(db.generationRecord.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "failed", failureReason: expect.any(String) }) }));
    log.mockRestore();
  });

  it("returns a safe provider error without exposing upstream details", async () => {
    vi.mocked(analyzeMaterials).mockRejectedValue(
      new Error("401 invalid api key sk-secret"),
    );
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await analyzeMaterialsPost(
      jsonRequest("http://localhost/api/ai/analyze-materials", {
        roomImageUrl: "/uploads/room.jpg",
        styleImageUrl: "/uploads/style.jpg",
        detailImageUrl: "/uploads/detail.jpg",
      }),
    );

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body).toEqual({ error: "AI 图片识别暂时失败，请稍后重试" });
    expect(JSON.stringify(body)).not.toContain("sk-secret");
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('"event":"material_analysis_failed"'),
    );
    expect(String(log.mock.calls[0]?.[0])).not.toContain("sk-secret");
    expect(String(log.mock.calls[0]?.[0])).toContain("[redacted-key]");
    expect(db.generationRecord.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "failed" }) }));
    log.mockRestore();
  });
});
