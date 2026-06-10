import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/prompts/route";
import { db } from "@/lib/db";

vi.mock("@/lib/auth/require-session", () => ({
  requireMerchantSession: vi.fn(async () => ({
    merchantId: "merchant_1",
    email: "demo@example.com",
  })),
}));

vi.mock("@/lib/db", () => ({
  db: {
    promptTemplate: {
      create: vi.fn(),
    },
  },
}));

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/prompts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("prompts API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid prompt templates", async () => {
    const response = await POST(
      jsonRequest({
        title: "",
        category: "room-style",
        body: "",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "提示词模板信息不完整",
    });
    expect(db.promptTemplate.create).not.toHaveBeenCalled();
  });

  it("creates merchant prompt templates", async () => {
    vi.mocked(db.promptTemplate.create).mockResolvedValueOnce({
      id: "prompt_1",
      merchantId: "merchant_1",
      title: "客厅模板",
      category: "room-style",
      body: "保留窗户结构，搭配米白窗帘。",
      isSystem: false,
      createdAt: new Date("2026-06-10T00:00:00Z"),
    });

    const response = await POST(
      jsonRequest({
        title: "客厅模板",
        category: "room-style",
        body: "保留窗户结构，搭配米白窗帘。",
      }),
    );

    expect(response.status).toBe(201);
    expect(db.promptTemplate.create).toHaveBeenCalledWith({
      data: {
        merchantId: "merchant_1",
        title: "客厅模板",
        category: "room-style",
        body: "保留窗户结构，搭配米白窗帘。",
        isSystem: false,
      },
    });
  });
});
