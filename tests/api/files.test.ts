// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/files/route";
import { requireMerchantSession } from "@/lib/auth/require-session";
import { saveUploadedFile } from "@/lib/files/storage";

vi.mock("@/lib/auth/require-session", () => ({
  requireMerchantSession: vi.fn(async () => ({
    merchantId: "merchant_1",
    email: "demo@example.com",
  })),
  unauthorizedResponse: () =>
    Response.json({ error: "请先登录" }, { status: 401 }),
}));

vi.mock("@/lib/files/storage", () => ({
  isSupportedImageFile: vi.fn(() => true),
  saveUploadedFile: vi.fn(async () => "/uploads/room.png"),
}));

function formRequest(file?: Blob) {
  const form = new FormData();
  if (file) {
    form.append("file", file, "room.png");
  }

  return new Request("http://localhost/api/files", {
    method: "POST",
    body: form,
  });
}

describe("files API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the merchant is not logged in", async () => {
    vi.mocked(requireMerchantSession).mockResolvedValueOnce(null as never);

    const response = await POST(
      formRequest(new Blob(["image-bytes"], { type: "image/png" })),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "请先登录",
    });
    expect(saveUploadedFile).not.toHaveBeenCalled();
  });

  it("uploads image files for logged in merchants", async () => {
    const response = await POST(
      formRequest(new Blob(["image-bytes"], { type: "image/png" })),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      url: "/uploads/room.png",
    });
    expect(saveUploadedFile).toHaveBeenCalledTimes(1);
  });
});
