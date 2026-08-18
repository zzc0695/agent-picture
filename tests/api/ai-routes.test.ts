import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as generateImagePost } from "@/app/api/ai/generate-image/route";
import { POST as analyzeMaterialsPost } from "@/app/api/ai/analyze-materials/route";
import { POST as optimizePromptPost } from "@/app/api/ai/optimize-prompt/route";
import { analyzeMaterials } from "@/lib/ai/material-analysis";
import { generateEffectImage } from "@/lib/ai/image";
import { optimizePrompt } from "@/lib/ai/prompt";
import { db } from "@/lib/db";

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
    generationRecord: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/ai/image", () => ({
  generateEffectImage: vi.fn(),
}));

vi.mock("@/lib/ai/material-analysis", () => ({
  analyzeMaterials: vi.fn(),
}));

vi.mock("@/lib/ai/prompt", () => ({
  optimizePrompt: vi.fn(),
}));

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("AI API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
        sampleImageUrl: "/uploads/sample.jpg",
        optimizedPrompt: "客厅窗帘",
        negativePrompt: "",
        fidelity: "exact",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "样本还原度无效",
    });
    expect(generateEffectImage).not.toHaveBeenCalled();
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
});
