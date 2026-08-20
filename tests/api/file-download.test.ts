// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/files/download/route";
import { requireMerchantSession } from "@/lib/auth/require-session";

vi.mock("@/lib/auth/require-session", () => ({
  requireMerchantSession: vi.fn(async () => ({
    merchantId: "merchant_1",
    email: "demo@example.com",
  })),
  unauthorizedResponse: () =>
    Response.json({ error: "请先登录" }, { status: 401 }),
}));

function downloadRequest(url: string) {
  return new Request(
    `http://localhost/api/files/download?url=${encodeURIComponent(url)}`,
  );
}

describe("effect image download API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { "content-type": "image/png" },
        }),
      ),
    );
  });

  it("requires a logged-in merchant", async () => {
    vi.mocked(requireMerchantSession).mockResolvedValueOnce(null as never);

    const response = await GET(downloadRequest("/uploads/effect.png"));

    expect(response.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns an uploaded image as an attachment", async () => {
    const response = await GET(downloadRequest("/uploads/effect.png"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("content-disposition")).toMatch(
      /^attachment; filename="curtain-plan-\d{8}\.png"$/,
    );
    expect(fetch).toHaveBeenCalledWith(
      new URL("http://localhost/uploads/effect.png"),
      { cache: "no-store" },
    );
  });

  it("rejects arbitrary external image URLs", async () => {
    const response = await GET(
      downloadRequest("https://example.com/effect.png"),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "不允许下载该图片来源",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects upstream non-image responses", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("not an image", {
        status: 200,
        headers: { "content-type": "text/plain" },
      }),
    );

    const response = await GET(downloadRequest("/uploads/effect.png"));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      error: "高清图片读取失败",
    });
  });
});
