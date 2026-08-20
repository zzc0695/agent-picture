// @vitest-environment node

import { describe, expect, it } from "vitest";
import { downloadFileName, resolveDownloadUrl } from "@/lib/files/download";

describe("download image helpers", () => {
  it("allows same-origin uploaded images", () => {
    expect(
      resolveDownloadUrl("/uploads/effect.png", "https://app.test").href,
    ).toBe("https://app.test/uploads/effect.png");
  });

  it("allows public Vercel Blob image URLs", () => {
    expect(
      resolveDownloadUrl(
        "https://store.public.blob.vercel-storage.com/effect.png",
        "https://app.test",
      ).hostname,
    ).toBe("store.public.blob.vercel-storage.com");
  });

  it("rejects arbitrary external URLs and non-upload same-origin paths", () => {
    expect(() =>
      resolveDownloadUrl("https://example.com/private", "https://app.test"),
    ).toThrow("不允许下载该图片来源");
    expect(() => resolveDownloadUrl("/api/plans", "https://app.test")).toThrow(
      "不允许下载该图片来源",
    );
  });

  it("creates a dated filename from the response content type", () => {
    const now = new Date("2026-08-20T02:00:00.000Z");
    expect(downloadFileName("image/png", now)).toBe(
      "curtain-plan-20260820.png",
    );
    expect(downloadFileName("image/jpeg", now)).toBe(
      "curtain-plan-20260820.jpg",
    );
    expect(downloadFileName("image/webp", now)).toBe(
      "curtain-plan-20260820.webp",
    );
  });
});
