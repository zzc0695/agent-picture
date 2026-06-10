import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/materials/route";
import { requireMerchantSession } from "@/lib/auth/require-session";
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
    material: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/materials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("materials API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the merchant is not logged in", async () => {
    vi.mocked(requireMerchantSession).mockResolvedValueOnce(null as never);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "请先登录",
    });
    expect(db.material.findMany).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid material payloads", async () => {
    const response = await POST(
      jsonRequest({
        category: "窗帘",
        color: "米白",
        fabric: "绒布",
        priceRange: "中高端",
        imageUrl: "/uploads/a.jpg",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "素材信息不完整",
    });
    expect(db.material.create).not.toHaveBeenCalled();
  });

  it("creates materials for the current merchant", async () => {
    vi.mocked(db.material.create).mockResolvedValueOnce({
      id: "material_1",
      merchantId: "merchant_1",
      name: "米白窗帘",
      category: "窗帘",
      color: "米白",
      fabric: "绒布",
      priceRange: "中高端",
      sizeNote: "适合落地窗",
      sellingPoints: "遮光强",
      imageUrl: "/uploads/a.jpg",
      createdAt: new Date("2026-06-10T00:00:00Z"),
    });

    const response = await POST(
      jsonRequest({
        name: "米白窗帘",
        category: "窗帘",
        color: "米白",
        fabric: "绒布",
        priceRange: "中高端",
        sizeNote: "适合落地窗",
        sellingPoints: "遮光强",
        imageUrl: "/uploads/a.jpg",
      }),
    );

    expect(response.status).toBe(201);
    expect(db.material.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        merchantId: "merchant_1",
        name: "米白窗帘",
      }),
    });
  });
});
