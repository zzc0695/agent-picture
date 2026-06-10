import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/plans/route";
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
    customerPlan: {
      create: vi.fn(),
    },
  },
}));

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("plans API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid plan payloads", async () => {
    const response = await POST(
      jsonRequest({
        customerName: "王女士",
        notes: "",
        roomImageUrl: "/uploads/room.jpg",
        sampleImageUrl: "/uploads/sample.jpg",
        originalPrompt: "",
        optimizedPrompt: "",
        negativePrompt: "",
        fidelity: "balanced",
        materialIds: [],
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "客户方案信息不完整",
    });
    expect(db.customerPlan.create).not.toHaveBeenCalled();
  });

  it("creates customer plans with selected materials", async () => {
    vi.mocked(db.customerPlan.create).mockResolvedValueOnce({
      id: "plan_1",
      merchantId: "merchant_1",
      customerName: "王女士",
      notes: "",
      roomImageUrl: "/uploads/room.jpg",
      sampleImageUrl: "/uploads/sample.jpg",
      originalPrompt: "现代简约窗帘",
      optimizedPrompt: "",
      negativePrompt: "",
      fidelity: "balanced",
      primaryImageUrl: null,
      similarImageUrls: "[]",
      shortVideoScript: null,
      socialCopy: null,
      customerScript: null,
      status: "draft",
      createdAt: new Date("2026-06-10T00:00:00Z"),
      updatedAt: new Date("2026-06-10T00:00:00Z"),
      materials: [{ planId: "plan_1", materialId: "material_1" }],
    });

    const response = await POST(
      jsonRequest({
        customerName: "王女士",
        notes: "",
        roomImageUrl: "/uploads/room.jpg",
        sampleImageUrl: "/uploads/sample.jpg",
        originalPrompt: "现代简约窗帘",
        optimizedPrompt: "",
        negativePrompt: "",
        fidelity: "balanced",
        primaryImageUrl: "/uploads/generated-effect.png",
        shortVideoScript: "短视频脚本内容",
        socialCopy: "朋友圈文案内容",
        customerScript: "客户沟通话术内容",
        status: "ready",
        materialIds: ["material_1"],
      }),
    );

    expect(response.status).toBe(201);
    expect(db.customerPlan.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        merchantId: "merchant_1",
        customerName: "王女士",
        primaryImageUrl: "/uploads/generated-effect.png",
        shortVideoScript: "短视频脚本内容",
        socialCopy: "朋友圈文案内容",
        customerScript: "客户沟通话术内容",
        status: "ready",
        materials: {
          create: [{ materialId: "material_1" }],
        },
      }),
      include: { materials: true },
    });
  });
});
